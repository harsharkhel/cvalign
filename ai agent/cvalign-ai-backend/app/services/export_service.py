from __future__ import annotations

import io
from typing import List

import pandas as pd
from sqlalchemy.orm import Session

from app.models.user import User
from app.models.login_log import LoginLog
from app.models.resume_analysis import ResumeAnalysis


def _to_excel_bytes(df: pd.DataFrame) -> bytes:
    buffer = io.BytesIO()
    with pd.ExcelWriter(buffer, engine="openpyxl") as writer:
        df.to_excel(writer, index=False)
    return buffer.getvalue()


def export_users_excel(db: Session) -> dict:
    rows: List[User] = db.query(User).order_by(User.id.desc()).all()
    df = pd.DataFrame(
        [
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
            for u in rows
        ]
    )
    content = _to_excel_bytes(df)
    return {
        "filename": "users.xlsx",
        "content_type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "content": content,
    }


def export_login_logs_excel(db: Session) -> dict:
    rows: List[LoginLog] = db.query(LoginLog).order_by(LoginLog.id.desc()).all()
    df = pd.DataFrame(
        [
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
    )
    content = _to_excel_bytes(df)
    return {
        "filename": "login_logs.xlsx",
        "content_type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "content": content,
    }


def export_resume_analyses_excel(db: Session) -> dict:
    rows: List[ResumeAnalysis] = db.query(ResumeAnalysis).order_by(ResumeAnalysis.id.desc()).all()
    df = pd.DataFrame(
        [
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
    )
    content = _to_excel_bytes(df)
    return {
        "filename": "resume_analyses.xlsx",
        "content_type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "content": content,
    }
