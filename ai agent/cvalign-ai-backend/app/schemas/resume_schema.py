from pydantic import BaseModel
from typing import Any, Dict, List, Optional


class ResumeAnalyzeResponse(BaseModel):
    analysis_id: int
    ats_score: float
    text_similarity_score: float
    skill_match_score: float

    matched_skills: List[str]
    missing_skills: List[str]
    resume_skills: List[str]
    jd_skills: List[str]

    suggestions: List[str]
    improved_bullets: List[str]


class ResumeHistoryItem(BaseModel):
    analysis_id: int
    candidate_name: Optional[str] = None
    job_title: Optional[str] = None
    company_name: Optional[str] = None
    ats_score: Optional[float] = None
    created_at: Optional[str] = None


class ResumeAnalysisDetailResponse(BaseModel):
    analysis_id: int
    candidate_name: Optional[str] = None
    resume_filename: Optional[str] = None
    job_title: Optional[str] = None
    company_name: Optional[str] = None

    ats_score: Optional[float] = None
    text_similarity_score: Optional[float] = None
    skill_match_score: Optional[float] = None

    matched_skills: List[str]
    missing_skills: List[str]
    resume_skills: List[str]
    jd_skills: List[str]

    suggestions: List[str]
    improved_bullets: List[str]
