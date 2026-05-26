from fastapi import APIRouter, Depends, File, UploadFile, Form, HTTPException
from sqlalchemy.orm import Session
from typing import List
import os
import json

from app.database import SessionLocal
from app.utils.dependencies import get_current_user
from app.config import settings
from app.services.resume_parser import extract_resume_text
from app.services.resume_analyzer import analyze
from app.services.suggestion_service import generate_rule_based_suggestions
from app.models.resume_analysis import ResumeAnalysis
from app.schemas.resume_schema import (
    ResumeAnalyzeResponse,
    ResumeHistoryItem,
    ResumeAnalysisDetailResponse,
)

router = APIRouter()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/analyze", response_model=ResumeAnalyzeResponse)
def analyze_resume(
    resume: UploadFile = File(...),
    job_description: str = Form(...),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    if not resume.filename:
        raise HTTPException(status_code=400, detail="Resume file is required")
    if not job_description or not job_description.strip():
        raise HTTPException(status_code=400, detail="Job description cannot be empty")

    content = resume.file.read()
    if not content or len(content) == 0:
        raise HTTPException(status_code=400, detail="Resume file is empty")

    lower = resume.filename.lower()
    if not (lower.endswith(".pdf") or lower.endswith(".docx")):
        raise HTTPException(status_code=400, detail="Invalid file type. Only PDF and DOCX are allowed.")

    # Save uploaded file to local folder for MVP
    upload_dir = settings.upload_dir
    os.makedirs(upload_dir, exist_ok=True)
    saved_path = os.path.join(upload_dir, f"{current_user['user_id']}_{resume.filename}")

    with open(saved_path, "wb") as f:
        f.write(content)

    candidate_name, resume_text = extract_resume_text(resume.filename, content)
    if not resume_text.strip():
        raise HTTPException(status_code=400, detail="Could not extract resume text")

    analysis = analyze(resume_text=resume_text, job_description=job_description)
    suggestions = generate_rule_based_suggestions(analysis)

    row = ResumeAnalysis(
        user_id=current_user["user_id"],
        candidate_name=candidate_name,
        resume_filename=resume.filename,
        job_title=None,
        company_name=None,
        job_description=job_description,
        resume_text=resume_text,
        ats_score=analysis["ats_score"],
        text_similarity_score=analysis["text_similarity_score"],
        skill_match_score=analysis["skill_match_score"],
        # Store lists as JSON text (stable + no eval)
        matched_skills=json.dumps(analysis["matched_skills"]),
        missing_skills=json.dumps(analysis["missing_skills"]),
        resume_skills=json.dumps(analysis["resume_skills"]),
        jd_skills=json.dumps(analysis["jd_skills"]),
        suggestions=json.dumps(suggestions["suggestions"]),
        improved_bullets=json.dumps(suggestions["improved_bullets"]),
    )
    db.add(row)
    db.commit()
    db.refresh(row)

    return ResumeAnalyzeResponse(
        analysis_id=row.id,
        ats_score=row.ats_score or 0.0,
        text_similarity_score=row.text_similarity_score or 0.0,
        skill_match_score=row.skill_match_score or 0.0,
        matched_skills=analysis["matched_skills"],
        missing_skills=analysis["missing_skills"],
        resume_skills=analysis["resume_skills"],
        jd_skills=analysis["jd_skills"],
        suggestions=suggestions["suggestions"],
        improved_bullets=suggestions["improved_bullets"],
    )


@router.get("/history", response_model=List[ResumeHistoryItem])
def history(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    rows = (
        db.query(ResumeAnalysis)
        .filter(ResumeAnalysis.user_id == current_user["user_id"])
        .order_by(ResumeAnalysis.id.desc())
        .limit(20)
        .all()
    )
    return [
        ResumeHistoryItem(
            analysis_id=r.id,
            candidate_name=r.candidate_name,
            job_title=r.job_title,
            company_name=r.company_name,
            ats_score=r.ats_score,
            created_at=r.created_at.isoformat() if r.created_at else None,
        )
        for r in rows
    ]


@router.get("/analysis/{analysis_id}", response_model=ResumeAnalysisDetailResponse)
def analysis_detail(analysis_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    row = (
        db.query(ResumeAnalysis)
        .filter(ResumeAnalysis.id == analysis_id, ResumeAnalysis.user_id == current_user["user_id"])
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Analysis not found")

    def parse_json_list(s: str):
        if not s:
            return []
        try:
            v = json.loads(s)
            return v if isinstance(v, list) else []
        except Exception:
            return []

    matched_skills = parse_json_list(row.matched_skills)
    missing_skills = parse_json_list(row.missing_skills)
    resume_skills = parse_json_list(row.resume_skills)
    jd_skills = parse_json_list(row.jd_skills)

    suggestions = parse_json_list(row.suggestions)
    improved_bullets = parse_json_list(row.improved_bullets)

    return ResumeAnalysisDetailResponse(
        analysis_id=row.id,
        candidate_name=row.candidate_name,
        resume_filename=row.resume_filename,
        job_title=row.job_title,
        company_name=row.company_name,
        ats_score=row.ats_score,
        text_similarity_score=row.text_similarity_score,
        skill_match_score=row.skill_match_score,
        matched_skills=matched_skills,
        missing_skills=missing_skills,
        resume_skills=resume_skills,
        jd_skills=jd_skills,
        suggestions=suggestions,
        improved_bullets=improved_bullets,
    )


@router.delete("/analysis/{analysis_id}")
def delete_analysis(analysis_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    row = (
        db.query(ResumeAnalysis)
        .filter(ResumeAnalysis.id == analysis_id, ResumeAnalysis.user_id == current_user["user_id"])
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Analysis not found")

    db.delete(row)
    db.commit()
    return {"status": "deleted", "analysis_id": analysis_id}
