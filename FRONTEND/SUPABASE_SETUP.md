# CVAlign AI — Supabase Setup

## 1. Create a Supabase project
- https://supabase.com/dashboard

## 2. Run database migration
In **SQL Editor**, paste and run:
`supabase/migrations/001_profiles_and_analyses.sql`

## 3. Enable Google OAuth (optional)
**Authentication → Providers → Google** — add client ID/secret.

**Authentication → URL Configuration:**
- Site URL: `http://localhost:3000` (dev) or your Vercel URL
- Redirect URLs: `http://localhost:3000/**`, `https://your-app.vercel.app/**`

## 4. Deploy Edge Function
```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase secrets set OPENAI_API_KEY=your_key   # optional
supabase functions deploy analyze-resume
```

## 5. Frontend `.env`
```env
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

## 6. Run locally
```bash
cd FRONTEND
npm install
npm run dev
```

## 7. Deploy to Vercel
- Root directory: `FRONTEND`
- Build: `npm run build`
- Output: `dist`
- Add env vars `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

SPA routing is handled by `vercel.json` rewrites to `index.html`.
