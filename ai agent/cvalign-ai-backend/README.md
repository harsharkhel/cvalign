# CVAlign AI Backend (FastAPI MVP)

## Overview
CVAlign AI is an AI-powered resume analyzer MVP backend.
Users can:
- Sign up / login (email+password)
- Login with Google ID token (Google profile identity only)
- Upload resume (PDF/DOCX) + paste job description
- Get an ATS-style resume match score, matched/missing skills, and rule-based suggestions
- View resume analysis history (protected)
- Admins can view dashboards and export Excel reports (users, login logs, resume analyses)

## Tech Stack
- FastAPI
- SQLAlchemy ORM
- JWT auth
- SQLite (dev) / PostgreSQL-ready via `DATABASE_URL`
- PyMuPDF (resume parsing note: current MVP uses `PyPDF2` + `python-docx`)
- python-docx
- scikit-learn TF-IDF similarity + rule-based keyword/skill matching
- openpyxl/pandas for Excel exports

## Project Structure
```
cvalign-ai-backend/
│
├── app/
│   ├── main.py
│   ├── config.py
│   ├── database.py
│   │
│   ├── models/
│   ├── schemas/
│   ├── routes/
│   ├── services/
│   └── utils/
│
├── requirements.txt
├── .env.example
├── README.md
└── run.py
```

## Setup

### 1) Install dependencies
From inside `cvalign-ai-backend`:
- `pip install -r requirements.txt`

### 2) Configure environment
Copy `.env.example` to `.env` and set:
- `JWT_SECRET_KEY`
- `GOOGLE_CLIENT_ID`

### 3) Run server
From inside `cvalign-ai-backend`:
- `python run.py`

Then open:
- Swagger UI: `http://localhost:8000/docs`
- Health: `http://localhost:8000/health`

## Authentication
JWT is returned from:
- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/google`

Protected endpoints require:
- `Authorization: Bearer <token>`

## Google Login (ID Token)
Frontend should send Google **ID token**:
- `POST /auth/google` with JSON body:
```json
{ "id_token": "..." }
```
Backend extracts email/name and creates/updates a local user record.

## Resume Analysis
`POST /resume/analyze` (multipart form-data):
- `resume`: PDF/DOCX file
- `job_description`: string

Returns:
- ATS-style match scores
- matched/missing skills
- suggestions + improved bullets
- analysis id to fetch details later

## Admin
Admin endpoints under `/admin` require admin role:
- `/admin/dashboard`
- `/admin/users`
- `/admin/login-logs`
- `/admin/resume-analyses`
- `/admin/export/users` (Excel)
- `/admin/export/login-logs` (Excel)
- `/admin/export/resume-analyses` (Excel)

## Notes / MVP Limitations
- Google token verification in this MVP is minimal (audience check + decode without signature verification).
  For production, integrate proper `google-auth` verification.
- Candidate name extraction is best-effort.
- Excel export returns file downloads via `StreamingResponse`.

## Future Upgrades
- Use proper Google ID token signature verification (google-auth)
- Add Alembic migrations
- PostgreSQL production deployment
- Better NLP skill extraction (NER/embeddings)
- LLM-based suggestions (optional)
- Cloud storage for uploads
