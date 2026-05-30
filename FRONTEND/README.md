# CVAlign Frontend

React + Vite UI for CVAlign resume analysis. Connects to the FastAPI backend via a dev proxy.

## Quick start (with backend)

1. **Backend** (from `cvalign` repo):

   ```bash
   cd "ai agent/cvalign-ai-backend"
   source .venv/bin/activate
   python run.py
   ```

2. **Frontend** (this repo):

   ```bash
   npm install
   cp .env.example .env
   npm run dev
   ```

3. Open http://localhost:3000 — login footer should show **API Backend: ONLINE**.

See `INTEGRATION.md` in the **cvalign** backend repo for full setup and troubleshooting.

## Environment

| Variable | Purpose |
|----------|---------|
| `VITE_API_BASE_URL` | API base (`/api` uses Vite proxy → `localhost:8000`) |
| `GEMINI_API_KEY` | Optional; AI Studio / Gemini features |

## Scripts

- `npm run dev` — Vite on port 3000 with `/api` proxy
- `npm run build` — production build
- `npm run lint` — TypeScript check
