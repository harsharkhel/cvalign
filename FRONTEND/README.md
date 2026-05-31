# CVAlign AI Frontend

React + Vite SPA with **Supabase** for authentication, database, storage, and resume analysis (Edge Functions).

## Quick start

```bash
cd FRONTEND
cp .env.example .env   # add VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
npm install
npm run dev
```

Open http://localhost:3000

## Supabase setup

See [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) for:
- SQL migration (`profiles`, `resume_analyses`, etc.)
- Google OAuth configuration
- Deploying the `analyze-resume` Edge Function

## Deploy (Vercel)

- **Root directory:** `FRONTEND`
- **Build command:** `npm run build`
- **Output directory:** `dist`
- **Environment variables:** `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

`vercel.json` rewrites all routes to `index.html` for SPA routing (fixes 404 on refresh).

## Auth

- Email/password via Supabase Auth (`signUp`, `signInWithPassword`, `signOut`)
- Google OAuth via Supabase (`signInWithOAuth`)
- User profiles stored in `profiles` table with empty `dashboard_data` until resume analysis

## Resume analysis

Frontend extracts PDF/DOCX text locally, then POSTs to:

```
{VITE_SUPABASE_URL}/functions/v1/analyze-resume
```

Passwords are never stored in the app — only Supabase Auth handles credentials.
