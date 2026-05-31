from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from jose import JWTError, jwt

from app.config import get_settings

settings = get_settings()


def build_token_payload(user_id: int, user_uuid: str, email: str, role: str) -> dict[str, Any]:
    """JWT claims: sub (user_uuid), user_id, email, role."""
    return {
        "sub": user_uuid,
        "user_id": user_id,
        "email": email,
        "role": role,
    }


def create_access_token(data: dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta
        if expires_delta
        else timedelta(minutes=settings.jwt_expires_in_minutes)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.jwt_secret, algorithm=settings.JWT_ALGORITHM)


def decode_access_token(token: str) -> Optional[dict[str, Any]]:
    try:
        return jwt.decode(
            token, settings.jwt_secret, algorithms=[settings.JWT_ALGORITHM]
        )
    except JWTError:
        return None
