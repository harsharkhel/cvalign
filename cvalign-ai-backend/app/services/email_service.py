import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

LOGIN_SUBJECT = "Successfully logged in to CVAlign AI"
LOGIN_BODY_TEMPLATE = (
    "Hi {name},\n\n"
    "You have successfully logged in to CVAlign AI.\n\n"
    "If this was not you, please contact support.\n\n"
    "— CVAlign AI Team"
)


def send_login_success_email(to_email: str, name: str) -> bool:
    """Send login notification email. Returns True if sent, False if skipped or failed."""
    if not settings.EMAIL_HOST or not settings.EMAIL_USER:
        logger.debug("Email not configured; skipping login notification")
        return False

    msg = MIMEMultipart()
    msg["From"] = settings.EMAIL_USER
    msg["To"] = to_email
    msg["Subject"] = LOGIN_SUBJECT
    display_name = name.strip() or "there"
    msg.attach(MIMEText(LOGIN_BODY_TEMPLATE.format(name=display_name), "plain"))

    try:
        with smtplib.SMTP(settings.EMAIL_HOST, settings.EMAIL_PORT, timeout=15) as server:
            if settings.EMAIL_USE_TLS:
                server.starttls()
            if settings.EMAIL_PASS:
                server.login(settings.EMAIL_USER, settings.EMAIL_PASS)
            server.sendmail(settings.EMAIL_USER, [to_email], msg.as_string())
        return True
    except Exception as exc:
        logger.warning("Failed to send login email: %s", type(exc).__name__)
        return False
