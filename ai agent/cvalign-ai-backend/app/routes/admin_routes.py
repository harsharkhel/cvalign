from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.utils.dependencies import get_current_user, require_admin
from app.models.user import User
from app.models.login_log import LoginLog
from app.models.resume_analysis import ResumeAnalysis
from app.services.export_service import (
    export_users_excel,
    export_login_logs_excel,
    export_resume_analyses_excel,
)

router = APIRouter()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("/dashboard")
def dashboard(
    db: Session = Depends(get_db),
    current_user=Depends(require_admin),
):
    total_users = db.query(User).count()
    total_google_users = db.query(User).filter(User.auth_provider == "google").count()
    total_local_users = db.query(User).filter(User.auth_provider == "local").count()

    total_resume_analyses = db.query(ResumeAnalysis).count()

    recent_logins = db.query(LoginLog).order_by(LoginLog.id.desc()).limit(10).all()
    recent_analyses = db.query(ResumeAnalysis).order_by(ResumeAnalysis.id.desc()).limit(10).all()

    avg_ats = db.query(ResumeAnalysis).filter(ResumeAnalysis.ats_score != None).all()  # noqa: E711
    avg_score = None
    if avg_ats:
        avg_score = sum([r.ats_score or 0.0 for r in avg_ats]) / len(avg_ats)

    failed_login_count = db.query(LoginLog).filter(LoginLog.status == "failed").count()

    return {
        "total_users": total_users,
        "total_google_users": total_google_users,
        "total_local_users": total_local_users,
        "total_resume_analyses": total_resume_analyses,
        "recent_logins": [
            {
                "id": l.id,
                "user_id": l.user_id,
                "email": l.email,
                "provider": l.provider,
                "status": l.status,
                "login_time": l.login_time.isoformat() if l.login_time else None,
            }
            for l in recent_logins
        ],
        "recent_analyses": [
            {
                "id": a.id,
                "user_id": a.user_id,
                "candidate_name": a.candidate_name,
                "ats_score": a.ats_score,
                "created_at": a.created_at.isoformat() if a.created_at else None,
            }
            for a in recent_analyses
        ],
        "average_ats_score": avg_score,
        "failed_login_count": failed_login_count,
    }


@router.get("/users")
def get_users(db: Session = Depends(get_db), current_user=Depends(require_admin)):
    users = db.query(User).order_by(User.id.desc()).limit(200).all()
    return [
        {
            "id": u.id,
            "name": u.name,
            "email": u.email,
            "role": u.role,
            "auth_provider": u.auth_provider,
            "is_email_verified": u.is_email_verified,
            "created_at": u.created_at.isoformat() if u.created_at else None,
            "last_login": u.last_login.isoformat() if u.last_login else None,
        }
        for u in users
    ]


@router.get("/login-logs")
def get_login_logs(
    db: Session = Depends(get_db),
    current_user=Depends(require_admin),
    limit: int = Query(50, ge=1, le=200),
):
    rows = db.query(LoginLog).order_by(LoginLog.id.desc()).limit(limit).all()
    return [
        {
            "id": r.id,
            "user_id": r.user_id,
            "email": r.email,
            "provider": r.provider,
            "status": r.status,
            "ip_address": r.ip_address,
            "device_info": r.device_info,
            "login_time": r.login_time.isoformat() if r.login_time else None,
        }
        for r in rows
    ]


@router.get("/resume-analyses")
def get_resume_analyses(
    db: Session = Depends(get_db),
    current_user=Depends(require_admin),
    limit: int = Query(50, ge=1, le=200),
):
    rows = db.query(ResumeAnalysis).order_by(ResumeAnalysis.id.desc()).limit(limit).all()
    return [
        {
            "id": r.id,
            "user_id": r.user_id,
            "candidate_name": r.candidate_name,
            "resume_filename": r.resume_filename,
            "job_title": r.job_title,
            "company_name": r.company_name,
            "ats_score": r.ats_score,
            "text_similarity_score": r.text_similarity_score,
            "skill_match_score": r.skill_match_score,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in rows
    ]


from fastapi.responses import StreamingResponse
import pandas as pd
import io

@router.get("/export/users")
def export_users(db: Session = Depends(get_db), current_user=Depends(require_admin)):
    payload = export_users_excel(db)
    # Export as direct file download
    content = payload["content"]
    return StreamingResponse(
        io.BytesIO(content),
        media_type=payload["content_type"],
        headers={"Content-Disposition": f'attachment; filename="{payload["filename"]}"'},
    )


@router.get("/export/login-logs")
def export_login_logs(db: Session = Depends(get_db), current_user=Depends(require_admin)):
    payload = export_login_logs_excel(db)
    content = payload["content"]
    return StreamingResponse(
        io.BytesIO(content),
        media_type=payload["content_type"],
        headers={"Content-Disposition": f'attachment; filename="{payload["filename"]}"'},
    )


@router.get("/export/resume-analyses")
def export_resume_analyses(db: Session = Depends(get_db), current_user=Depends(require_admin)):
    payload = export_resume_analyses_excel(db)
    content = payload["content"]
    return StreamingResponse(
        io.BytesIO(content),
        media_type=payload["content_type"],
        headers={"Content-Disposition": f'attachment; filename="{payload["filename"]}"'},
    )
