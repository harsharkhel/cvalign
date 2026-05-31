import logging
from datetime import datetime, timezone
from typing import Literal

from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

AuthAction = Literal["signup", "login"]
AuthStatus = Literal["success", "failed"]


def log_auth_event_to_sheet(
    *,
    name: str,
    email: str,
    auth_provider: str,
    action: AuthAction,
    status: AuthStatus = "success",
) -> bool:
    """
    Append an auth audit row to Google Sheets.
    Never stores passwords or tokens — only audit metadata.
    """
    if not settings.GOOGLE_SHEET_ID or not settings.GOOGLE_SERVICE_ACCOUNT_EMAIL:
        logger.debug("Google Sheets audit not configured; skipping")
        return False

    private_key = settings.google_private_key_normalized
    if not private_key:
        logger.debug("GOOGLE_PRIVATE_KEY missing; skipping sheet log")
        return False

    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
    row = [timestamp, name, email, auth_provider, action, status]

    try:
        from google.oauth2 import service_account
        from googleapiclient.discovery import build

        creds = service_account.Credentials.from_service_account_info(
            {
                "type": "service_account",
                "client_email": settings.GOOGLE_SERVICE_ACCOUNT_EMAIL,
                "private_key": private_key,
                "token_uri": "https://oauth2.googleapis.com/token",
            },
            scopes=["https://www.googleapis.com/auth/spreadsheets"],
        )
        service = build("sheets", "v4", credentials=creds, cache_discovery=False)
        service.spreadsheets().values().append(
            spreadsheetId=settings.GOOGLE_SHEET_ID,
            range="A:F",
            valueInputOption="RAW",
            insertDataOption="INSERT_ROWS",
            body={"values": [row]},
        ).execute()
        return True
    except Exception as exc:
        logger.warning("Failed to log auth event to Google Sheet: %s", type(exc).__name__)
        return False
