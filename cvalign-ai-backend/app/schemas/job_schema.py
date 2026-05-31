from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


class JobResponse(BaseModel):
    id: int
    source: str
    title: str
    company: str
    location: Optional[str] = None
    job_type: str
    remote_type: str
    description: str
    skills: List[str] = Field(default_factory=list)
    salary: Optional[str] = None
    stipend: Optional[str] = None
    apply_url: Optional[str] = None
    source_url: Optional[str] = None
    posted_at: Optional[datetime] = None
    fetched_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class JobSearchResponse(BaseModel):
    jobs: List[JobResponse]
    total: int


class JobRecommendationItem(BaseModel):
    job_id: int
    title: str
    company: str
    location: Optional[str] = None
    source: str
    match_score: float
    matched_skills: List[str]
    missing_skills: List[str]
    recommendation_reason: str
    apply_url: Optional[str] = None


class JobRecommendationsResponse(BaseModel):
    recommendations: List[JobRecommendationItem]
    message: str = ""


class JobMatchResponse(BaseModel):
    job_id: int
    match_score: float
    matched_skills: List[str]
    missing_skills: List[str]
    recommendation_reason: str


class JobRecommendRequest(BaseModel):
    resume_analysis_id: Optional[int] = None
    role_preference: str = Field("", max_length=200)
    location: str = Field("", max_length=100)
    experience_level: str = Field("", max_length=50)
    job_type: Optional[str] = None
    limit: int = Field(10, ge=1, le=20)


class JobSaveRequest(BaseModel):
    job_id: int
    resume_analysis_id: Optional[int] = None


class SavedJobItem(BaseModel):
    id: int
    job_id: int
    title: str
    company: str
    location: Optional[str] = None
    source: str
    match_score: float
    matched_skills: List[str]
    missing_skills: List[str]
    recommendation_reason: str
    apply_url: Optional[str] = None
    is_saved: bool = True
    created_at: Optional[datetime] = None


class SavedJobsResponse(BaseModel):
    jobs: List[SavedJobItem]
    total: int
