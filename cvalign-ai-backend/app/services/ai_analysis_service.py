import json
import re
from typing import Any, Optional

from app.config import get_settings

settings = get_settings()

RESUME_ANALYSIS_PROMPT = """Analyze this resume against the given job description. Give an honest ATS-style analysis. Do not guarantee selection. Identify matched skills, missing skills, missing keywords, weak resume sections, project improvements, better bullet points, and learning roadmap.

Resume Text:
{resume_text}

Job Description:
{job_description}

Return structured JSON only:
{{
  "ats_score": 0-100,
  "fit_level": "strong/moderate/weak",
  "matched_skills": [],
  "missing_skills": [],
  "missing_keywords": [],
  "resume_strengths": [],
  "resume_weaknesses": [],
  "suggestions": [],
  "improved_bullets": [],
  "learning_roadmap": [],
  "final_summary": ""
}}"""


def _extract_json(text: str) -> Optional[dict]:
    text = text.strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    match = re.search(r"\{[\s\S]*\}", text)
    if match:
        try:
            return json.loads(match.group())
        except json.JSONDecodeError:
            return None
    return None


def _default_ai_result(local: dict) -> dict:
    return {
        "ats_score": local.get("ats_score", 0),
        "fit_level": "moderate",
        "matched_skills": local.get("matched_skills", []),
        "missing_skills": local.get("missing_skills", []),
        "missing_keywords": [],
        "resume_strengths": [],
        "resume_weaknesses": [],
        "suggestions": [
            "Align resume keywords with the job description.",
            "Quantify achievements in bullet points.",
        ],
        "improved_bullets": [],
        "learning_roadmap": local.get("missing_skills", [])[:5],
        "final_summary": (
            "ATS-style Resume Match Score is based on text and skill similarity. "
            "This is not a guarantee of ATS or hiring outcome."
        ),
        "ai_available": False,
    }


def _call_openai(prompt: str) -> Optional[str]:
    if not settings.OPENAI_API_KEY:
        return None
    try:
        from openai import OpenAI

        client = OpenAI(api_key=settings.OPENAI_API_KEY)
        response = client.chat.completions.create(
            model=settings.OPENAI_MODEL,
            messages=[
                {"role": "system", "content": "You are a resume analyst. Respond with valid JSON only."},
                {"role": "user", "content": prompt},
            ],
            temperature=0.3,
        )
        return response.choices[0].message.content
    except Exception:
        return None


def _call_gemini(prompt: str) -> Optional[str]:
    if not settings.GEMINI_API_KEY:
        return None
    try:
        import google.generativeai as genai

        genai.configure(api_key=settings.GEMINI_API_KEY)
        model = genai.GenerativeModel(settings.GEMINI_MODEL)
        response = model.generate_content(
            prompt + "\n\nRespond with valid JSON only, no markdown."
        )
        return response.text
    except Exception:
        return None


def run_ai_resume_analysis(resume_text: str, job_description: str, local: dict) -> dict:
    prompt = RESUME_ANALYSIS_PROMPT.format(
        resume_text=resume_text[:8000],
        job_description=job_description[:8000],
    )

    raw = _call_openai(prompt)
    if not raw:
        raw = _call_gemini(prompt)

    if not raw:
        result = _default_ai_result(local)
        return result

    parsed = _extract_json(raw)
    if not parsed:
        result = _default_ai_result(local)
        result["ai_available"] = False
        return result

    result = _default_ai_result(local)
    result["ai_available"] = True
    result["ai_estimated_score"] = parsed.get("ats_score")
    result["fit_level"] = parsed.get("fit_level", "moderate")
    result["matched_skills"] = parsed.get("matched_skills") or local.get("matched_skills", [])
    result["missing_skills"] = parsed.get("missing_skills") or local.get("missing_skills", [])
    result["missing_keywords"] = parsed.get("missing_keywords", [])
    result["resume_strengths"] = parsed.get("resume_strengths", [])
    result["resume_weaknesses"] = parsed.get("resume_weaknesses", [])
    result["suggestions"] = parsed.get("suggestions", result["suggestions"])
    result["improved_bullets"] = parsed.get("improved_bullets", [])
    result["learning_roadmap"] = parsed.get("learning_roadmap", [])
    result["final_summary"] = parsed.get("final_summary") or result["final_summary"]
    return result


def merge_analysis(local: dict, ai: dict) -> dict[str, Any]:
    return {
        "ats_score": local["ats_score"],
        "text_similarity_score": local["text_similarity_score"],
        "skill_match_score": local["skill_match_score"],
        "matched_skills": ai.get("matched_skills", local["matched_skills"]),
        "missing_skills": ai.get("missing_skills", local["missing_skills"]),
        "resume_skills": local["resume_skills"],
        "jd_skills": local["jd_skills"],
        "suggestions": ai.get("suggestions", []),
        "improved_bullets": ai.get("improved_bullets", []),
        "learning_roadmap": ai.get("learning_roadmap", []),
        "final_summary": ai.get("final_summary", ""),
        "fit_level": ai.get("fit_level"),
        "ai_estimated_score": ai.get("ai_estimated_score"),
        "missing_keywords": ai.get("missing_keywords", []),
        "resume_strengths": ai.get("resume_strengths", []),
        "resume_weaknesses": ai.get("resume_weaknesses", []),
        "ai_analysis_json": ai,
    }
