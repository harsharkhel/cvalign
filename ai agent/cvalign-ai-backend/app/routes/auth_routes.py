from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.config import settings
from app.database import SessionLocal
from app.schemas.auth_schema import (
    GoogleLoginRequest,
    LoginRequest,
    MeResponse,
    RegisterRequest,
    TokenResponse,
)
from app.schemas.user_schema import UserResponse
from app.services.auth_service import register_user, login_user, issue_token_for_user
from app.services.google_auth_service import google_login, verify_google_id_token
from app.utils.dependencies import get_current_user
from app.models.login_log import LoginLog
from app.models.user import User

from app.utils.dependencies import get_db
from app.utils.jwt_handler import decode_token

router = APIRouter()


@router.post("/register", response_model=TokenResponse)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    try:
        user = register_user(db=db, name=payload.name, email=payload.email, password=payload.password)
        token = issue_token_for_user(user)
        return TokenResponse(access_token=token)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, request: Request, db: Session = Depends(get_db)):
    try:
        user = login_user(db=db, email=payload.email, password=payload.password)

        login_log = LoginLog(
            user_id=user.id,
            email=user.email,
            provider="local",
            status="success",
            ip_address=request.client.host if request.client else None,
            device_info=request.headers.get("user-agent"),
        )
        db.add(login_log)
        db.commit()

        token = issue_token_for_user(user)
        return TokenResponse(access_token=token)
    except ValueError as e:
        # failed login log
        user = db.query(User).filter(User.email == payload.email).first()
        login_log = LoginLog(
            user_id=user.id if user else -1,
            email=payload.email,
            provider="local",
            status="failed",
            ip_address=request.client.host if request.client else None,
            device_info=request.headers.get("user-agent"),
        )
        db.add(login_log)
        db.commit()

        raise HTTPException(status_code=401, detail=str(e))


@router.post("/google", response_model=TokenResponse)
def google_login_endpoint(payload: GoogleLoginRequest, request: Request, db: Session = Depends(get_db)):
    try:
        # verify token + extract identity
        decoded = verify_google_id_token(payload.id_token, settings.google_client_id)

        # perform login / create user
        result = google_login(db=db, id_token=payload.id_token, google_client_id=settings.google_client_id)

        # store login log
        user = db.query(User).filter(User.email == decoded["email"]).first()
        login_log = LoginLog(
            user_id=user.id if user else -1,
            email=decoded["email"],
            provider="google",
            status="success",
            ip_address=request.client.host if request.client else None,
            device_info=request.headers.get("user-agent"),
        )
        db.add(login_log)
        db.commit()

        return TokenResponse(access_token=result["access_token"])
    except ValueError as e:
        # failed log
        login_log = LoginLog(
            user_id=-1,
            email="unknown",
            provider="google",
            status="failed",
            ip_address=request.client.host if request.client else None,
            device_info=request.headers.get("user-agent"),
        )
        db.add(login_log)
        db.commit()
        raise HTTPException(status_code=401, detail=str(e))


@router.get("/me", response_model=MeResponse)
def me(current_user=Depends(get_current_user)):
    return MeResponse(user_id=current_user["user_id"], name=current_user["email"].split("@")[0], email=current_user["email"], role=current_user["role"])
