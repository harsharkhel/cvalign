from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.job import Job
from app.models.job_recommendation import JobRecommendation
from app.models.user import User
from app.schemas.job_schema import (
    JobMatchResponse,
    JobRecommendationItem,
    JobRecommendationsResponse,
    JobRecommendRequest,
    JobResponse,
    JobSaveRequest,
    JobSearchResponse,
    SavedJobItem,
    SavedJobsResponse,
)
from app.services.job_recommendation_service import get_recommendations, match_single_job
from app.services.job_search_service import job_to_response, search_jobs
from app.utils.dependencies import get_current_user
from app.utils.rate_limiter import limiter

router = APIRouter(prefix="/jobs", tags=["Jobs"])


@router.get("/search", response_model=JobSearchResponse)
@limiter.limit("30/minute")
def search(
    request: Request,
    query: str = Query("", max_length=200),
    location: str = Query("", max_length=100),
    job_type: Optional[str] = Query(None),
    limit: int = Query(20, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    jobs, _ = search_jobs(db, current_user.id, query, location, job_type, limit)
    return JobSearchResponse(
        jobs=[job_to_response(j) for j in jobs],
        total=len(jobs),
    )


@router.post("/recommend", response_model=JobRecommendationsResponse)
@limiter.limit("15/minute")
def recommend_jobs(
    request: Request,
    data: JobRecommendRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    recs, message = get_recommendations(
        db,
        current_user.id,
        resume_analysis_id=data.resume_analysis_id,
        role_preference=data.role_preference,
        location=data.location,
        limit=data.limit,
    )
    return JobRecommendationsResponse(
        recommendations=[JobRecommendationItem(**r) for r in recs],
        message=message or "",
    )


@router.get("/recommendations", response_model=JobRecommendationsResponse)
def recommendations(
    resume_analysis_id: Optional[int] = Query(None),
    role_preference: str = Query("", max_length=200),
    location: str = Query("", max_length=100),
    limit: int = Query(10, ge=1, le=20),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    recs, message = get_recommendations(
        db,
        current_user.id,
        resume_analysis_id=resume_analysis_id,
        role_preference=role_preference,
        location=location,
        limit=limit,
    )
    return JobRecommendationsResponse(
        recommendations=[JobRecommendationItem(**r) for r in recs],
        message=message or "",
    )


@router.post("/save", response_model=SavedJobItem)
def save_job(
    data: JobSaveRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    job = db.query(Job).filter(Job.id == data.job_id, Job.is_active == True).first()  # noqa: E712
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")

    existing = (
        db.query(JobRecommendation)
        .filter(
            JobRecommendation.user_id == current_user.id,
            JobRecommendation.job_id == data.job_id,
        )
        .order_by(JobRecommendation.created_at.desc())
        .first()
    )

    if existing:
        existing.is_saved = True
        db.commit()
        db.refresh(existing)
        rec = existing
    else:
        match_single_job(db, current_user.id, data.job_id, data.resume_analysis_id)
        rec = (
            db.query(JobRecommendation)
            .filter(
                JobRecommendation.user_id == current_user.id,
                JobRecommendation.job_id == data.job_id,
            )
            .order_by(JobRecommendation.created_at.desc())
            .first()
        )
        if rec:
            rec.is_saved = True
            db.commit()
            db.refresh(rec)

    if not rec:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Save failed")

    return SavedJobItem(
        id=rec.id,
        job_id=job.id,
        title=job.title,
        company=job.company,
        location=job.location,
        source=job.source,
        match_score=rec.match_score,
        matched_skills=rec.matched_skills_json or [],
        missing_skills=rec.missing_skills_json or [],
        recommendation_reason=rec.recommendation_reason or "",
        apply_url=job.apply_url,
        is_saved=True,
        created_at=rec.created_at,
    )


@router.get("/saved", response_model=SavedJobsResponse)
def saved_jobs(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    recs = (
        db.query(JobRecommendation)
        .filter(
            JobRecommendation.user_id == current_user.id,
            JobRecommendation.is_saved == True,  # noqa: E712
        )
        .order_by(JobRecommendation.created_at.desc())
        .all()
    )
    items = []
    for rec in recs:
        job = db.query(Job).filter(Job.id == rec.job_id).first()
        if not job:
            continue
        items.append(
            SavedJobItem(
                id=rec.id,
                job_id=job.id,
                title=job.title,
                company=job.company,
                location=job.location,
                source=job.source,
                match_score=rec.match_score,
                matched_skills=rec.matched_skills_json or [],
                missing_skills=rec.missing_skills_json or [],
                recommendation_reason=rec.recommendation_reason or "",
                apply_url=job.apply_url,
                is_saved=True,
                created_at=rec.created_at,
            )
        )
    return SavedJobsResponse(jobs=items, total=len(items))


@router.get("/{job_id}", response_model=JobResponse)
def get_job(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    job = db.query(Job).filter(Job.id == job_id, Job.is_active == True).first()  # noqa: E712
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
    return job_to_response(job)


@router.post("/match/{job_id}", response_model=JobMatchResponse)
def match_job(
    job_id: int,
    resume_analysis_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = match_single_job(db, current_user.id, job_id, resume_analysis_id)
    return JobMatchResponse(**result)
