# Local development — Frontend + Backend

## URLs

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8000 |
| API docs | http://localhost:8000/docs |
| Proxied API | http://localhost:3000/api/* → localhost:8000 |

## Quick start

**Terminal 1 — Backend**
```bash
cd cvalign-ai-backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # edit if needed
python3 run.py
```

**Terminal 2 — Frontend**
```bash
cd ../FRONTEND
npm install
cp .env.example .env   # Firebase keys already documented
npm run dev
```

**Or use the helper script (both at once):**
```bash
bash scripts/dev-local.sh
```

## Integration test

With both servers running:
```bash
bash scripts/test-integration.sh
```

Tests: backend health, frontend HTML, Vite `/api` proxy, CORS, register, `/auth/me`, login.

## Localhost configuration

### Backend (`cvalign-ai-backend/.env`)
```
FRONTEND_URL=http://localhost:3000
ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
FIREBASE_PROJECT_ID=your_project_id
```

Development mode auto-allows `localhost:3000`, `127.0.0.1:3000`, and Vite `:5173`.

### Frontend (`FRONTEND/.env`)
```
VITE_API_BASE_URL=/api
APP_URL=http://localhost:3000
VITE_FIREBASE_*=...
```

Vite proxies `/api` → `http://localhost:8000` (see `FRONTEND/vite.config.ts`).

### Firebase Console
Add to **Authentication → Settings → Authorized domains**:
- `localhost`
- `127.0.0.1`

## New features (auth, email, sheets, chat, jobs)

### Email login notifications
Set SMTP credentials in `cvalign-ai-backend/.env`:
```
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=you@gmail.com
EMAIL_PASS=your_app_password
```
On every successful signup or login, the backend sends:
**Subject:** Successfully logged in to CVAlign AI

### Google Sheets audit log
1. Create a Google Cloud service account with Sheets API enabled.
2. Share your spreadsheet with the service account email (Editor).
3. Set in `.env`:
```
GOOGLE_SERVICE_ACCOUNT_EMAIL=...@....iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_SHEET_ID=your_sheet_id
```
Header row (optional): `timestamp | name | email | authProvider | action | status`

### Google OAuth (backend redirect)
```
GOOGLE_CLIENT_ID=....apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=...
GOOGLE_CALLBACK_URL=http://localhost:8000/auth/google/callback
```
Add authorized redirect URI in Google Cloud Console. Frontend button **Google OAuth (Backend)** starts `GET /auth/google`.

### Job APIs
```
ADZUNA_APP_ID=...
ADZUNA_APP_KEY=...
JOOBLE_API_KEY=...
SERPAPI_KEY=...   # optional
```

## API routes (complete list)

| Method | Route | Auth |
|--------|-------|------|
| POST | `/auth/register` | Public |
| POST | `/auth/login` | Public |
| POST | `/auth/google` | Public (Firebase ID token) |
| GET | `/auth/google` | Public (OAuth redirect) |
| GET | `/auth/google/callback` | Public |
| POST | `/auth/google/token` | Public (GSI credential) |
| GET | `/auth/me` | JWT |
| POST | `/auth/logout` | JWT |
| POST | `/resume/upload` | JWT |
| POST | `/resume/analyze` | JWT |
| GET | `/resume/history` | JWT |
| POST | `/chat/message` | JWT |
| GET | `/chat/history` | JWT |
| POST | `/jobs/recommend` | JWT |
| GET | `/jobs/recommendations` | JWT |
| GET | `/jobs/search` | JWT |
| POST | `/jobs/save` | JWT |
| GET | `/jobs/saved` | JWT |
| GET | `/admin/users` | Admin |
| GET | `/admin/login-logs` | Admin |

## Testing checklist

- [ ] Register with email/password — password stored as bcrypt hash only
- [ ] Duplicate email returns 409
- [ ] Login sends email (check inbox or mock in tests)
- [ ] Login/signup appends row to Google Sheet
- [ ] Google OAuth creates new user / logs in existing user
- [ ] Resume upload + analyze still work
- [ ] Chatbot responds with resume context
- [ ] Job recommendations return live jobs with apply links
- [ ] Protected routes return 401 without JWT

Run backend tests:
```bash
cd cvalign-ai-backend
python -m pytest tests/ -q
```

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Port 8000 in use | `lsof -ti :8000 \| xargs kill` then restart backend |
| API OFFLINE on login | Ensure backend is `cvalign-ai-backend`, not an old copy |
| CORS error | Check `ALLOWED_ORIGINS` includes `http://localhost:3000` |
| Google login fails | Enable Google provider + add localhost in Firebase |
