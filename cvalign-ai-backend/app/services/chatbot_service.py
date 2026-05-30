from typing import Optional

from sqlalchemy.orm import Session

from app.config import get_settings
from app.models.ai_chat_message import AIChatMessage
from app.models.job import Job
from app.models.job_recommendation import JobRecommendation
from app.models.resume_analysis import ResumeAnalysis
from app.services.ai_analysis_service import _call_gemini, _call_openai

settings = get_settings()

CHAT_SYSTEM = """You are CVAlign AI career assistant. Answer using ONLY the context provided.
Rules:
- Do not guarantee job selection or rejection.
- Do not fabricate job URLs, companies, or salaries not in context.
- If information is missing, say you are uncertain.
- Be helpful about resume improvements, skills, and job fit.
- Refer to scores as ATS-style match scores, not guarantees."""


def build_context(
    db: Session,
    user_id: int,
    resume_analysis_id: Optional[int] = None,
    job_id: Optional[int] = None,
) -> dict:
    ctx = {"has_resume_analysis": False, "has_job": False, "recommendations": []}

    analysis_q = db.query(ResumeAnalysis).filter(ResumeAnalysis.user_id == user_id)
    if resume_analysis_id:
        analysis = analysis_q.filter(ResumeAnalysis.id == resume_analysis_id).first()
    else:
        analysis = analysis_q.order_by(ResumeAnalysis.created_at.desc()).first()

    if analysis:
        ctx["has_resume_analysis"] = True
        ctx["analysis_id"] = analysis.id
        ctx["ats_score"] = analysis.ats_score
        ctx["fit_level"] = (analysis.suggestions_json or {}).get("fit_level")
        ctx["missing_skills"] = analysis.missing_skills_json or []
        ctx["matched_skills"] = analysis.matched_skills_json or []
        ctx["resume_snippet"] = analysis.resume_text[:1500]
        ctx["job_description_snippet"] = analysis.job_description[:1500]
        ctx["final_summary"] = (analysis.suggestions_json or {}).get("final_summary", "")

    if job_id:
        job = db.query(Job).filter(Job.id == job_id).first()
        if job:
            ctx["has_job"] = True
            ctx["job"] = {
                "id": job.id,
                "title": job.title,
                "company": job.company,
                "location": job.location,
                "description": job.description[:2000],
                "skills": job.skills_json or [],
                "apply_url": job.apply_url,
            }

    recs = (
        db.query(JobRecommendation)
        .filter(JobRecommendation.user_id == user_id)
        .order_by(JobRecommendation.created_at.desc())
        .limit(5)
        .all()
    )
    for rec in recs:
        job = db.query(Job).filter(Job.id == rec.job_id).first()
        if job:
            ctx["recommendations"].append(
                {
                    "title": job.title,
                    "company": job.company,
                    "match_score": rec.match_score,
                }
            )

    return ctx


def _generate_response(message: str, context: dict) -> str:
    context_str = str(context)[:6000]
    prompt = f"{CHAT_SYSTEM}\n\nContext:\n{context_str}\n\nUser question: {message}"

    raw = _call_openai(prompt)
    if raw:
        return raw.strip()

    raw = _call_gemini(prompt)
    if raw:
        return raw.strip()

    return _fallback_response(message, context)


def _fallback_response(message: str, context: dict) -> str:
    if not context.get("has_resume_analysis"):
        return (
            "I don't have resume analysis context yet. Please upload your resume "
            "and run an analysis first."
        )

    msg_lower = message.lower()
    missing = context.get("missing_skills", [])
    ats = context.get("ats_score", 0)

    if "score" in msg_lower or "low" in msg_lower:
        return (
            f"Your ATS-style match score is {ats}. This reflects text and skill overlap — "
            f"not a hiring guarantee. Focus on missing skills: {', '.join(missing[:5]) or 'none identified'}."
        )
    if "skill" in msg_lower:
        return f"Prioritize learning: {', '.join(missing[:5]) or 'review the job description for required skills'}."
    if "improve" in msg_lower or "resume" in msg_lower:
        return (
            "Improve quantified bullet points, align keywords with the job description, "
            "and address missing skills from your latest analysis."
        )
    return (
        f"Based on your analysis (score {ats}), I can help with skills, resume tips, and job fit. "
        "Ask a specific question. Note: AI enrichment is unavailable without API keys configured."
    )


def chat(
    db: Session,
    user_id: int,
    message: str,
    resume_analysis_id: Optional[int] = None,
    job_id: Optional[int] = None,
) -> tuple[AIChatMessage, dict]:
    if resume_analysis_id:
        analysis = (
            db.query(ResumeAnalysis)
            .filter(ResumeAnalysis.id == resume_analysis_id, ResumeAnalysis.user_id == user_id)
            .first()
        )
        if not analysis:
            from fastapi import HTTPException, status

            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Analysis not found")

    if job_id:
        job = db.query(Job).filter(Job.id == job_id).first()
        if not job:
            from fastapi import HTTPException, status

            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")

    context = build_context(db, user_id, resume_analysis_id, job_id)
    safe_context = {k: v for k, v in context.items() if k not in ("resume_snippet",)}
    safe_context["resume_available"] = context.get("has_resume_analysis", False)

    ai_response = _generate_response(message, context)

    record = AIChatMessage(
        user_id=user_id,
        resume_analysis_id=resume_analysis_id or context.get("analysis_id"),
        job_id=job_id,
        user_message=message,
        ai_response=ai_response,
        context_used_json=safe_context,
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    return record, safe_context
