from datetime import datetime, timezone
from typing import Optional

from sqlalchemy.orm import Session

from app.models.user import User, AuthProvider
from app.utils.security import hash_password, verify_password
from app.utils.jwt_handler import create_access_token


def get_user_by_email(db: Session, email: str) -> Optional[User]:
    return db.query(User).filter(User.email == email).first()


def register_user(db: Session, name: str, email: str, password: str) -> User:
    existing = get_user_by_email(db, email)
    if existing:
        raise ValueError("Email already registered")

    password_hash = hash_password(password)
    user = User(
        name=name,
        email=email,
        password_hash=password_hash,
        auth_provider=AuthProvider.local.value,
        is_email_verified=False,
        role="user",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def login_user(db: Session, email: str, password: str) -> User:
    user = get_user_by_email(db, email)
    if not user or not user.password_hash:
        raise ValueError("Invalid email or password")

    if not verify_password(password, user.password_hash):
        raise ValueError("Invalid email or password")

    user.last_login = datetime.now(timezone.utc)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def issue_token_for_user(user: User) -> str:
    payload = {"user_id": user.id, "email": user.email, "role": user.role}
    return create_access_token(payload)
