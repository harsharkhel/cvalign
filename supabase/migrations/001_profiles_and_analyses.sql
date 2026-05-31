-- CVAlign AI: profiles, resume analyses, chat, saved jobs
-- Run in Supabase SQL Editor or via supabase db push

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  email text not null default '',
  avatar_url text,
  auth_provider text not null default 'email',
  dashboard_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.profiles enable row level security;

create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name, email, auth_provider, dashboard_data)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name', split_part(coalesce(new.email, ''), '@', 1), 'User'),
    coalesce(new.email, ''),
    coalesce(new.raw_app_meta_data->>'provider', 'email'),
    '{}'::jsonb
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create table if not exists public.resume_analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  resume_filename text,
  job_title text,
  company_name text,
  job_description text,
  ats_score numeric not null default 0,
  text_similarity_score numeric not null default 0,
  skill_match_score numeric not null default 0,
  matched_skills jsonb not null default '[]'::jsonb,
  missing_skills jsonb not null default '[]'::jsonb,
  resume_skills jsonb not null default '[]'::jsonb,
  jd_skills jsonb not null default '[]'::jsonb,
  suggestions jsonb not null default '[]'::jsonb,
  improved_bullets jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.resume_analyses enable row level security;

create policy "resume_analyses_all_own"
  on public.resume_analyses for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  user_message text not null,
  ai_response text not null,
  resume_analysis_id uuid references public.resume_analyses(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.chat_messages enable row level security;

create policy "chat_messages_all_own"
  on public.chat_messages for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table if not exists public.saved_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  company text not null,
  location text,
  source text not null default 'manual',
  match_score numeric not null default 0,
  matched_skills jsonb not null default '[]'::jsonb,
  missing_skills jsonb not null default '[]'::jsonb,
  recommendation_reason text,
  apply_url text,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.saved_jobs enable row level security;

create policy "saved_jobs_all_own"
  on public.saved_jobs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Storage bucket for resumes (optional)
insert into storage.buckets (id, name, public)
values ('resumes', 'resumes', false)
on conflict (id) do nothing;

create policy "resumes_upload_own"
  on storage.objects for insert
  with check (bucket_id = 'resumes' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "resumes_read_own"
  on storage.objects for select
  using (bucket_id = 'resumes' and auth.uid()::text = (storage.foldername(name))[1]);
