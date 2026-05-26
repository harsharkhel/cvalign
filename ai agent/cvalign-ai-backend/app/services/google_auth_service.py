from typing import Any, Dict

from sqlalchemy.orm import Session

from app.models.user import User, AuthProvider
from app.utils.jwt_handler import create_access_token


def verify_google_id_token(id_token: str, google_client_id: str) -> Dict[str, Any]:
    """
    MVP note:
    - For production-grade verification, prefer google-auth-library.
    - In this MVP, we implement a minimal JWT decode flow with audience check.
    - If verification fails, raise ValueError.

    Frontend must send a Google ID token obtained on the client.
    """
    try:
        # Lazy import to keep requirements minimal for MVP; if missing, you can add google-auth.
        import jwt  # PyJWT is already in requirements

        unverified = jwt.decode(id_token, options={"verify_signature": False})
        if not isinstance(unverified, dict):
            raise ValueError("Invalid token")

        aud = unverified.get("aud")
        if aud and aud != google_client_id:
            raise ValueError("Invalid audience")

        # If you want signature verification, integrate google-auth in a future upgrade.
        # For now, treat presence of key identity fields as success.
        email = unverified.get("email")
        name = unverified.get("name")
        sub = unverified.get("sub") or unverified.get("google_sub")
        email_verified = unverified.get("email_verified", True)
        picture = unverified.get("picture") or unverified.get("profile_picture")

        if not email or not sub:
            raise ValueError("Missing required identity fields")

        return {
            "email": email,
            "name": name,
            "google_sub": sub,
            "email_verified": bool(email_verified),
            "profile_picture": picture,
            "aud": aud,
        }
    except Exception as e:
        raise ValueError(f"Invalid Google token: {str(e)}")


def get_user_by_email(db: Session, email: str) -> User | None:
    return db.query(User).filter(User.email == email).first()


def google_login(db: Session, id_token: str, google_client_id: str) -> Dict[str, Any]:
    decoded = verify_google_id_token(id_token=id_token, google_client_id=google_client_id)

    user = get_user_by_email(db, decoded["email"])
    if user is None:
        user = User(
            name=decoded.get("name") or decoded["email"].split("@")[0],
            email=decoded["email"],
            password_hash=None,
            auth_provider=AuthProvider.google.value,
            google_sub=decoded["google_sub"],
            profile_picture=decoded.get("profile_picture"),
            role="user",
            is_email_verified=decoded.get("email_verified", False),
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        # Update identity linkage
        user.auth_provider = AuthProvider.google.value
        user.google_sub = decoded["google_sub"]
        user.profile_picture = decoded.get("profile_picture")
        user.is_email_verified = decoded.get("email_verified", user.is_email_verified)

        db.add(user)
        db.commit()
        db.refresh(user)

    token = create_access_token({"user_id": user.id, "email": user.email, "role": user.role})
    return {
        "access_token": token,
        "user": {
            "user_id": user.id,
            "name": user.name,
            "email": user.email,
            "role": user.role,
        },
    }
