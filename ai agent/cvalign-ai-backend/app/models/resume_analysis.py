from sqlalchemy import Integer, String, DateTime, Text, Float
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.database import Base


class ResumeAnalysis(Base):
    __tablename__ = "resume_analyses"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    user_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)

    candidate_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    resume_filename: Mapped[str | None] = mapped_column(String(500), nullable=True)

    job_title: Mapped[str | None] = mapped_column(String(200), nullable=True)
    company_name: Mapped[str | None] = mapped_column(String(200), nullable=True)

    job_description: Mapped[str | None] = mapped_column(Text, nullable=True)

    # extracted/clean resume text
    resume_text: Mapped[str | None] = mapped_column(Text, nullable=True)

    ats_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    text_similarity_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    skill_match_score: Mapped[float | None] = mapped_column(Float, nullable=True)

    matched_skills: Mapped[str] = mapped_column(Text, nullable=False, default="[]")
    missing_skills: Mapped[str] = mapped_column(Text, nullable=False, default="[]")

    resume_skills: Mapped[str] = mapped_column(Text, nullable=False, default="[]")
    jd_skills: Mapped[str] = mapped_column(Text, nullable=False, default="[]")

    suggestions: Mapped[str] = mapped_column(Text, nullable=False, default="[]")
    improved_bullets: Mapped[str] = mapped_column(Text, nullable=False, default="[]")

    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
