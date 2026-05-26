from datetime import datetime, timedelta, timezone
from typing import Any, Dict

import jwt

from app.config import settings


def create_access_token(payload: Dict[str, Any], expires_minutes: int | None = None) -> str:
    expire_minutes = expires_minutes if expires_minutes is not None else settings.access_token_expire_minutes
    now = datetime.now(timezone.utc)
    exp = now + timedelta(minutes=expire_minutes)

    to_encode = dict(payload)
    to_encode.update({"exp": exp, "iat": now})
    token = jwt.encode(to_encode, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)
    return token


def decode_token(token: str) -> Dict[str, Any]:
    decoded = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
    return decoded
