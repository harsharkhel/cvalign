from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.models.user import User
from app.schemas.auth_schema import (
    AuthResponse,
    GoogleLoginRequest,
    GoogleTokenRequest,
    LoginRequest,
    MessageResponse,
    RegisterRequest,
)
from app.schemas.user_schema import UserResponse
from app.services.auth_service import login_user, register_user
from app.services.google_auth_service import google_login
from app.services.google_oauth_service import (
    build_google_oauth_url,
    exchange_oauth_code,
    google_token_login,
)
from app.utils.dependencies import (
    get_client_ip,
    get_current_user,
    get_device_info,
    user_to_response,
)
from app.utils.rate_limiter import limiter

router = APIRouter(prefix="/auth", tags=["Auth"])
settings = get_settings()


@router.post("/register", response_model=AuthResponse)
@limiter.limit("3/minute")
def register(
    request: Request,
    data: RegisterRequest,
    db: Session = Depends(get_db),
):
    user, token = register_user(db, data, get_client_ip(request), get_device_info(request))
    return AuthResponse(access_token=token, user=user_to_response(user))


@router.post("/login", response_model=AuthResponse)
@limiter.limit("5/minute")
def login(
    request: Request,
    data: LoginRequest,
    db: Session = Depends(get_db),
):
    user, token = login_user(db, data, get_client_ip(request), get_device_info(request))
    return AuthResponse(access_token=token, user=user_to_response(user))


@router.post("/google", response_model=AuthResponse)
@limiter.limit("5/minute")
def google_auth(
    request: Request,
    data: GoogleLoginRequest,
    db: Session = Depends(get_db),
):
    user, token = google_login(
        db, data.id_token, get_client_ip(request), get_device_info(request)
    )
    return AuthResponse(access_token=token, user=user_to_response(user))


@router.get("/google")
@limiter.limit("10/minute")
def google_oauth_start(request: Request):
    """Redirect browser to Google OAuth consent screen."""
    url, _state = build_google_oauth_url()
    return RedirectResponse(url=url, status_code=status.HTTP_302_FOUND)


@router.get("/google/callback")
@limiter.limit("10/minute")
async def google_oauth_callback(
    request: Request,
    code: str = Query(...),
    state: str = Query(""),
    db: Session = Depends(get_db),
):
    """Handle Google OAuth redirect and send JWT to frontend."""
    _ = state  # state validated client-side via redirect; optional CSRF hardening later
    user, token = await exchange_oauth_code(
        db, code, get_client_ip(request), get_device_info(request)
    )
    _ = user
    redirect_url = f"{settings.FRONTEND_URL.rstrip('/')}/auth/callback?token={token}"
    return RedirectResponse(url=redirect_url, status_code=status.HTTP_302_FOUND)


@router.post("/google/token", response_model=AuthResponse)
@limiter.limit("5/minute")
def google_token_auth(
    request: Request,
    data: GoogleTokenRequest,
    db: Session = Depends(get_db),
):
    """Verify Google Sign-In credential token from frontend GSI button."""
    user, token = google_token_login(
        db, data.credential, get_client_ip(request), get_device_info(request)
    )
    return AuthResponse(access_token=token, user=user_to_response(user))


@router.get("/me", response_model=UserResponse)
def me(current_user: User = Depends(get_current_user)):
    return user_to_response(current_user)


@router.post("/logout", response_model=MessageResponse)
def logout(current_user: User = Depends(get_current_user)):
    return MessageResponse(message="Logged out successfully. Discard your token on the client.")
