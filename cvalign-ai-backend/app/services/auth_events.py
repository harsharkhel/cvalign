import logging
from typing import Literal

from app.services.email_service import send_login_success_email
from app.services.google_sheets_service import log_auth_event_to_sheet

logger = logging.getLogger(__name__)

AuthAction = Literal["signup", "login"]


def handle_auth_success(
    *,
    name: str,
    email: str,
    auth_provider: str,
    action: AuthAction,
) -> None:
    """Fire-and-forget post-auth notifications (email + Google Sheets audit)."""
    try:
        send_login_success_email(email, name)
    except Exception as exc:
        logger.warning("Login email notification error: %s", type(exc).__name__)

    try:
        log_auth_event_to_sheet(
            name=name,
            email=email,
            auth_provider=auth_provider,
            action=action,
            status="success",
        )
    except Exception as exc:
        logger.warning("Google Sheets audit error: %s", type(exc).__name__)
