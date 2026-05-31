import logging
import secrets
from datetime import datetime, timezone
from urllib.parse import urlencode

import httpx
from fastapi import HTTPException, status
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token
from sqlalchemy.orm import Session

from app.config import get_settings
from app.models.login_log import LoginLog, LoginProvider, LoginStatus
from app.models.user import AuthProvider, User
from app.services.auth_events import handle_auth_success
from app.services.dashboard_service import create_dashboard_snapshot
from app.utils.jwt_handler import build_token_payload, create_access_token

logger = logging.getLogger(__name__)
settings = get_settings()

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
OAUTH_SCOPES = "openid email profile"


def _oauth_configured() -> bool:
    return bool(
        settings.GOOGLE_CLIENT_ID
        and settings.GOOGLE_CLIENT_SECRET
        and settings.GOOGLE_CALLBACK_URL
    )


def build_google_oauth_url() -> tuple[str, str]:
    if not _oauth_configured():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google OAuth is not configured on the server",
        )
    state = secrets.token_urlsafe(32)
    params = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": settings.GOOGLE_CALLBACK_URL,
        "response_type": "code",
        "scope": OAUTH_SCOPES,
        "state": state,
        "access_type": "online",
        "prompt": "select_account",
    }
    return f"{GOOGLE_AUTH_URL}?{urlencode(params)}", state


def _verify_google_id_token(id_token_str: str) -> dict:
    audiences = [settings.GOOGLE_CLIENT_ID]
    if settings.FIREBASE_PROJECT_ID:
        audiences.append(settings.FIREBASE_PROJECT_ID)

    last_error: Exception | None = None
    for audience in audiences:
        if not audience:
            continue
        try:
            return google_id_token.verify_oauth2_token(
                id_token_str,
                google_requests.Request(),
                audience,
            )
        except Exception as exc:
            last_error = exc
            continue

    logger.debug("Google ID token verification failed: %s", last_error)
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid Google credential token",
    )


def _log_google(
    db: Session,
    email: str,
    status_val: LoginStatus,
    user_id: int | None,
    ip_address: str,
    device_info: str,
):
    db.add(
        LoginLog(
            user_id=user_id,
            email=email,
            provider=LoginProvider.google,
            status=status_val,
            ip_address=ip_address,
            device_info=device_info,
        )
    )
    db.commit()


def _upsert_google_user(db: Session, idinfo: dict) -> tuple[User, bool]:
    """Return (user, is_new_signup)."""
    google_sub = idinfo.get("sub")
    email = (idinfo.get("email") or "").lower()
    name = idinfo.get("name") or (email.split("@")[0] if email else "User")
    picture = idinfo.get("picture")
    email_verified = bool(idinfo.get("email_verified", False))

    if not google_sub or not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Google token missing required fields",
        )

    user = db.query(User).filter(User.google_sub == google_sub).first()
    is_new = False
    if not user:
        user = db.query(User).filter(User.email == email).first()

    now = datetime.now(timezone.utc)

    if user:
        user.google_sub = google_sub
        user.profile_picture = picture or user.profile_picture
        user.is_email_verified = email_verified or user.is_email_verified
        user.last_login = now
        if user.auth_provider == AuthProvider.local:
            user.auth_provider = AuthProvider.both
        elif user.auth_provider != AuthProvider.both:
            user.auth_provider = AuthProvider.google
        if not user.name and name:
            user.name = name
    else:
        is_new = True
        user = User(
            name=name,
            email=email,
            password_hash=None,
            auth_provider=AuthProvider.google,
            google_sub=google_sub,
            profile_picture=picture,
            is_email_verified=email_verified,
            is_active=True,
            last_login=now,
        )
        db.add(user)

    db.commit()
    db.refresh(user)
    return user, is_new


def google_token_login(
    db: Session,
    credential: str,
    ip_address: str,
    device_info: str,
) -> tuple[User, str]:
    """Verify Google credential (One Tap / GSI) and issue JWT."""
    idinfo = _verify_google_id_token(credential)
    email = (idinfo.get("email") or "").lower()

    try:
        user, is_new = _upsert_google_user(db, idinfo)
    except HTTPException:
        _log_google(db, email or "unknown", LoginStatus.failed, None, ip_address, device_info)
        raise

    if is_new:
        create_dashboard_snapshot(db, user.id)

    _log_google(db, email, LoginStatus.success, user.id, ip_address, device_info)
    handle_auth_success(
        name=user.name,
        email=user.email,
        auth_provider="google",
        action="signup" if is_new else "login",
    )

    token = create_access_token(
        build_token_payload(user.id, user.user_uuid, user.email, user.role.value)
    )
    return user, token


async def exchange_oauth_code(
    db: Session,
    code: str,
    ip_address: str,
    device_info: str,
) -> tuple[User, str]:
    if not _oauth_configured():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google OAuth is not configured",
        )

    async with httpx.AsyncClient(timeout=20) as client:
        token_resp = await client.post(
            GOOGLE_TOKEN_URL,
            data={
                "code": code,
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "redirect_uri": settings.GOOGLE_CALLBACK_URL,
                "grant_type": "authorization_code",
            },
        )

    if token_resp.status_code != 200:
        logger.debug("Google token exchange failed: %s", token_resp.status_code)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Google OAuth token exchange failed",
        )

    tokens = token_resp.json()
    id_token_str = tokens.get("id_token")
    if not id_token_str:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Google OAuth response missing id_token",
        )

    idinfo = _verify_google_id_token(id_token_str)
    email = (idinfo.get("email") or "").lower()

    try:
        user, is_new = _upsert_google_user(db, idinfo)
    except HTTPException:
        _log_google(db, email or "unknown", LoginStatus.failed, None, ip_address, device_info)
        raise

    if is_new:
        create_dashboard_snapshot(db, user.id)

    _log_google(db, email, LoginStatus.success, user.id, ip_address, device_info)
    handle_auth_success(
        name=user.name,
        email=user.email,
        auth_provider="google",
        action="signup" if is_new else "login",
    )

    token = create_access_token(
        build_token_payload(user.id, user.user_uuid, user.email, user.role.value)
    )
    return user, token
