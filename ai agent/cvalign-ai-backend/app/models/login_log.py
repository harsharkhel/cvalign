from sqlalchemy import Integer, String, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.database import Base


class LoginLog(Base):
    __tablename__ = "login_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)

    email: Mapped[str] = mapped_column(String(200), nullable=False, index=True)

    provider: Mapped[str] = mapped_column(String(20), nullable=False)  # local/google
    status: Mapped[str] = mapped_column(String(20), nullable=False)  # success/failed

    ip_address: Mapped[str | None] = mapped_column(String(100), nullable=True)
    device_info: Mapped[str | None] = mapped_column(String(500), nullable=True)

    login_time: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
