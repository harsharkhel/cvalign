from unittest.mock import MagicMock, patch

from app.models.user import User
from app.utils.security import hash_password, verify_password


def test_register_password_hashed_in_db(client, db):
    client.post(
        "/auth/register",
        json={"name": "Hash Test", "email": "hash@example.com", "password": "Secure1pass"},
    )
    user = db.query(User).filter(User.email == "hash@example.com").first()
    assert user is not None
    assert user.password_hash is not None
    assert user.password_hash != "Secure1pass"
    assert verify_password("Secure1pass", user.password_hash)


def test_duplicate_email_blocked(client):
    payload = {"name": "Dup", "email": "dup@example.com", "password": "Secure1pass"}
    assert client.post("/auth/register", json=payload).status_code == 200
    assert client.post("/auth/register", json=payload).status_code == 409


@patch("app.services.auth_events.log_auth_event_to_sheet")
@patch("app.services.auth_events.send_login_success_email")
def test_login_sends_email_and_logs_sheet(mock_email, mock_sheet, client):
    mock_email.return_value = True
    mock_sheet.return_value = True
    client.post(
        "/auth/register",
        json={"name": "Notify", "email": "notify@example.com", "password": "Secure1pass"},
    )
    mock_email.reset_mock()
    mock_sheet.reset_mock()

    resp = client.post(
        "/auth/login",
        json={"email": "notify@example.com", "password": "Secure1pass"},
    )
    assert resp.status_code == 200
    mock_email.assert_called_once()
    mock_sheet.assert_called_once()
    call_kwargs = mock_sheet.call_args.kwargs
    assert call_kwargs["action"] == "login"
    assert call_kwargs["status"] == "success"
    assert call_kwargs["email"] == "notify@example.com"


@patch("app.services.auth_events.log_auth_event_to_sheet")
@patch("app.services.auth_events.send_login_success_email")
def test_signup_logs_sheet_as_signup(mock_email, mock_sheet, client):
    mock_email.return_value = True
    mock_sheet.return_value = True
    client.post(
        "/auth/register",
        json={"name": "New User", "email": "newuser@example.com", "password": "Secure1pass"},
    )
    call_kwargs = mock_sheet.call_args.kwargs
    assert call_kwargs["action"] == "signup"


@patch("app.services.google_oauth_service._verify_google_id_token")
@patch("app.services.auth_events.log_auth_event_to_sheet")
@patch("app.services.auth_events.send_login_success_email")
def test_google_token_creates_new_user(mock_email, mock_sheet, mock_verify, client, db):
    mock_email.return_value = True
    mock_sheet.return_value = True
    mock_verify.return_value = {
        "sub": "google-sub-123",
        "email": "googlenew@example.com",
        "name": "Google User",
        "email_verified": True,
    }
    resp = client.post(
        "/auth/google/token",
        json={"credential": "fake-google-credential-token"},
    )
    assert resp.status_code == 200
    user = db.query(User).filter(User.email == "googlenew@example.com").first()
    assert user is not None
    assert user.google_sub == "google-sub-123"
    assert mock_sheet.call_args.kwargs["action"] == "signup"


@patch("app.services.google_oauth_service._verify_google_id_token")
@patch("app.services.auth_events.log_auth_event_to_sheet")
@patch("app.services.auth_events.send_login_success_email")
def test_google_token_logs_in_existing_user(mock_email, mock_sheet, mock_verify, client, db):
    mock_email.return_value = True
    mock_sheet.return_value = True
    existing = User(
        name="Existing",
        email="existing@example.com",
        password_hash=hash_password("Secure1pass"),
    )
    db.add(existing)
    db.commit()

    mock_verify.return_value = {
        "sub": "google-sub-456",
        "email": "existing@example.com",
        "name": "Existing",
        "email_verified": True,
    }
    resp = client.post(
        "/auth/google/token",
        json={"credential": "fake-google-credential-token"},
    )
    assert resp.status_code == 200
    assert mock_sheet.call_args.kwargs["action"] == "login"


def test_protected_route_rejects_unauthenticated(client):
    resp = client.get("/auth/me")
    assert resp.status_code == 401


def test_chat_message_alias(auth_headers, client):
    resp = client.post(
        "/chat/message",
        headers=auth_headers,
        json={"message": "How can I improve my resume?"},
    )
    assert resp.status_code == 200
    assert "ai_response" in resp.json()


def test_jobs_recommend_requires_auth(client):
    resp = client.post("/jobs/recommend", json={"role_preference": "developer"})
    assert resp.status_code == 401
