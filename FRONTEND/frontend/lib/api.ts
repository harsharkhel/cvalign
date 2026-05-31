import { AnalysisResult } from '../types';
import {
  supabase,
  isSupabaseConfigured,
  signUpWithEmail,
  signInWithEmail,
  signOutUser,
  signInWithGoogle,
  getAccessToken,
  getCurrentSession,
  ensureProfileForUser,
  fetchProfile,
} from '../../src/lib/supabase.js';
import { extractResumeText } from './resumeTextExtractor';

export interface SessionUser {
  user_uuid?: string;
  name: string;
  email: string;
  role?: string;
  auth_provider?: string;
  profile_picture?: string | null;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const ANALYZE_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/analyze-resume`;

export function getToken(): string | null {
  return localStorage.getItem('cvalign_supabase_token');
}

export function setAuth(token: string, session: SessionUser) {
  localStorage.setItem('cvalign_supabase_token', token);
  localStorage.setItem('cvalign_session', JSON.stringify(session));
}

export function clearAuth() {
  localStorage.removeItem('cvalign_supabase_token');
  localStorage.removeItem('cvalign_session');
}

export function getSession(): SessionUser | null {
  const raw = localStorage.getItem('cvalign_session');
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SessionUser;
  } catch {
    return null;
  }
}

function sessionFromProfile(
  userId: string,
  email: string,
  profile: Record<string, unknown> | null,
  authProvider = 'email'
): SessionUser {
  return {
    user_uuid: userId,
    name: (profile?.name as string) || email.split('@')[0] || 'User',
    email: (profile?.email as string) || email,
    role: 'user',
    auth_provider: (profile?.auth_provider as string) || authProvider,
    profile_picture: (profile?.avatar_url as string) || null,
  };
}

async function syncSessionFromSupabase() {
  const session = await getCurrentSession();
  if (!session?.user) return null;

  const profile = await ensureProfileForUser(session.user);
  const userSession = sessionFromProfile(
    session.user.id,
    session.user.email || '',
    profile as Record<string, unknown> | null,
    session.user.app_metadata?.provider === 'google' ? 'google' : 'email'
  );
  setAuth(session.access_token, userSession);
  return userSession;
}

export async function registerUser(name: string, email: string, password: string): Promise<SessionUser> {
  await signUpWithEmail(name, email, password);
  const session = await getCurrentSession();
  if (!session?.user) {
    throw new Error('Check your email to confirm your account, then log in.');
  }
  await ensureProfileForUser(session.user);
  return syncSessionFromSupabase() as Promise<SessionUser>;
}

export async function loginUser(email: string, password: string): Promise<SessionUser> {
  await signInWithEmail(email, password);
  const user = await syncSessionFromSupabase();
  if (!user) throw new Error('Login failed');
  return user;
}

export async function logoutUser(): Promise<void> {
  await signOutUser();
  clearAuth();
}

export async function loginWithGoogleOAuth(): Promise<void> {
  await signInWithGoogle();
}

export async function fetchMe(): Promise<SessionUser> {
  const session = await getCurrentSession();
  if (!session?.user) throw new Error('Not authenticated');

  const profile = await fetchProfile(session.user.id);
  const userSession = sessionFromProfile(
    session.user.id,
    session.user.email || '',
    profile,
    session.user.app_metadata?.provider === 'google' ? 'google' : 'email'
  );
  setAuth(session.access_token, userSession);
  return userSession;
}

export interface ResumeAnalyzeResponse {
  analysis_id: string;
  ats_score: number;
  text_similarity_score: number;
  skill_match_score: number;
  matched_skills: string[];
  missing_skills: string[];
  resume_skills: string[];
  jd_skills: string[];
  suggestions: string[];
  improved_bullets: string[];
}

interface BackendAnalysisResponse {
  id: string;
  resume_filename?: string;
  job_title?: string | null;
  company_name?: string | null;
  ats_score: number;
  text_similarity_score: number;
  skill_match_score: number;
  matched_skills: string[];
  missing_skills: string[];
  resume_skills: string[];
  jd_skills: string[];
  suggestions: string[];
  improved_bullets: string[];
}

function mapAnalysisResponse(data: BackendAnalysisResponse): ResumeAnalyzeResponse {
  return {
    analysis_id: data.id,
    ats_score: Number(data.ats_score),
    text_similarity_score: Number(data.text_similarity_score),
    skill_match_score: Number(data.skill_match_score),
    matched_skills: data.matched_skills ?? [],
    missing_skills: data.missing_skills ?? [],
    resume_skills: data.resume_skills ?? [],
    jd_skills: data.jd_skills ?? [],
    suggestions: data.suggestions ?? [],
    improved_bullets: data.improved_bullets ?? [],
  };
}

export async function analyzeResume(
  file: File,
  jobDescription: string,
  meta?: { jobTitle?: string; companyName?: string }
): Promise<ResumeAnalyzeResponse> {
  const token = (await getAccessToken()) || getToken();
  if (!token) throw new Error('You must be logged in to analyze a resume.');

  const resumeText = await extractResumeText(file);

  const res = await fetch(ANALYZE_FUNCTION_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
    },
    body: JSON.stringify({
      resume_text: resumeText,
      resume_filename: file.name,
      job_description: jobDescription,
      job_title: meta?.jobTitle || null,
      company_name: meta?.companyName || null,
    }),
  });

  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = await res.json();
      message = body.error || body.message || message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  const data = (await res.json()) as BackendAnalysisResponse;
  return mapAnalysisResponse(data);
}

export interface ResumeHistoryItem {
  analysis_id: string;
  candidate_name?: string | null;
  job_title?: string | null;
  company_name?: string | null;
  ats_score?: number | null;
  created_at?: string | null;
}

export async function fetchResumeHistory(): Promise<ResumeHistoryItem[]> {
  const session = await getCurrentSession();
  if (!session?.user) return [];

  const { data, error } = await supabase
    .from('resume_analyses')
    .select('id, job_title, company_name, ats_score, created_at')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []).map((item) => ({
    analysis_id: item.id,
    candidate_name: null,
    job_title: item.job_title,
    company_name: item.company_name,
    ats_score: item.ats_score,
    created_at: item.created_at,
  }));
}

export async function fetchAnalysisDetail(analysisId: string): Promise<
  ResumeAnalyzeResponse & {
    candidate_name?: string | null;
    resume_filename?: string | null;
    job_title?: string | null;
    company_name?: string | null;
  }
> {
  const session = await getCurrentSession();
  if (!session?.user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('resume_analyses')
    .select('*')
    .eq('id', analysisId)
    .eq('user_id', session.user.id)
    .single();

  if (error || !data) throw new Error(error?.message || 'Analysis not found');

  return {
    ...mapAnalysisResponse(data as BackendAnalysisResponse),
    candidate_name: null,
    resume_filename: data.resume_filename ?? null,
    job_title: data.job_title ?? null,
    company_name: data.company_name ?? null,
  };
}

export function mapAnalyzeResponseToResult(
  response: ResumeAnalyzeResponse,
  meta: {
    candidateName: string;
    targetRole: string;
    roleCategory: string;
    companyName: string;
    jobDescription: string;
  }
): AnalysisResult {
  const jdMatchScore = Math.round(response.ats_score);
  const currentSourceScore = Math.round(response.skill_match_score * 100);
  const historicalDataScore = Math.round(response.text_similarity_score * 100);
  const finalScore = Math.round((jdMatchScore + currentSourceScore + historicalDataScore) / 3);
  const status =
    finalScore >= 75 ? 'Optimal' : finalScore >= 50 ? 'Needs Revision' : 'Weak Match';

  return {
    id: `ALN-${response.analysis_id}`,
    date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
    candidateName: meta.candidateName,
    targetRole: meta.targetRole,
    roleCategory: meta.roleCategory,
    companyName: meta.companyName,
    jdMatchScore,
    currentSourceScore,
    historicalDataScore,
    finalScore,
    status,
    matchedKeywords: response.matched_skills,
    missingKeywords: response.missing_skills.map((keyword, i) => ({
      keyword,
      importance: (i === 0 ? 'High' : i === 1 ? 'Medium' : 'Low') as 'High' | 'Medium' | 'Low',
    })),
    resumeStructureChecklist: [
      { item: 'Email Address', present: true },
      { item: 'Phone Number', present: true },
      { item: 'LinkedIn Link', present: response.resume_skills.length > 0 },
      { item: 'Portfolio/GitHub Link', present: response.matched_skills.length > 2 },
      { item: 'Education Section', present: true },
      { item: 'Skills Section', present: response.resume_skills.length > 0 },
      { item: 'Experience Section', present: true },
    ],
    suggestions: response.suggestions,
    improvedBullets: response.improved_bullets,
    resumeTextSnippet: `Skills detected: ${response.resume_skills.slice(0, 8).join(', ')}`,
    jobDescription: meta.jobDescription,
  };
}

export async function loadHistoryAsRecords(): Promise<AnalysisResult[]> {
  const history = await fetchResumeHistory();
  const records: AnalysisResult[] = [];

  for (const item of history.slice(0, 10)) {
    try {
      const detail = await fetchAnalysisDetail(item.analysis_id);
      records.push(
        mapAnalyzeResponseToResult(detail, {
          candidateName: detail.candidate_name || item.candidate_name || 'Candidate',
          targetRole: detail.job_title || item.job_title || 'Role',
          roleCategory: 'General / Any Role',
          companyName: detail.company_name || item.company_name || 'Company',
          jobDescription: '',
        })
      );
    } catch {
      const score = Math.round(item.ats_score ?? 0);
      records.push({
        id: `ALN-${item.analysis_id}`,
        date: item.created_at
          ? new Date(item.created_at).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })
          : new Date().toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            }),
        candidateName: item.candidate_name || 'Candidate',
        targetRole: item.job_title || 'Role',
        roleCategory: 'General / Any Role',
        companyName: item.company_name || 'Company',
        jdMatchScore: score,
        currentSourceScore: score,
        historicalDataScore: score,
        finalScore: score,
        status: score >= 75 ? 'Optimal' : score >= 50 ? 'Needs Revision' : 'Weak Match',
        matchedKeywords: [],
        missingKeywords: [],
        resumeStructureChecklist: [],
        suggestions: [],
        improvedBullets: [],
        resumeTextSnippet: '',
        jobDescription: '',
      });
    }
  }

  return records;
}

export interface ChatMessage {
  id: string;
  user_message: string;
  ai_response: string;
  resume_analysis_id?: string | null;
  created_at?: string;
}

export async function sendChatMessage(
  message: string,
  _resumeAnalysisId?: string
): Promise<{ id: string; ai_response: string; context_summary: Record<string, unknown> }> {
  const session = await getCurrentSession();
  if (!session?.user) throw new Error('Not authenticated');

  const { data: analyses } = await supabase
    .from('resume_analyses')
    .select('ats_score, missing_skills, matched_skills, job_title')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false })
    .limit(1);

  const latest = analyses?.[0];
  const contextSummary = latest
    ? { has_resume_analysis: true, ats_score: latest.ats_score, missing_skills: latest.missing_skills }
    : { has_resume_analysis: false };

  let aiResponse =
    'Upload and analyze a resume first so I can give personalized career guidance.';

  if (latest) {
    aiResponse = `Based on your latest analysis (ATS score ${latest.ats_score}), focus on closing skill gaps: ${(latest.missing_skills as string[] | undefined)?.slice(0, 5).join(', ') || 'review your matched keywords'}. For "${message}", tailor your resume bullets to mirror the target role language and quantify outcomes.`;
  }

  const { data, error } = await supabase
    .from('chat_messages')
    .insert({
      user_id: session.user.id,
      user_message: message,
      ai_response: aiResponse,
    })
    .select('id')
    .single();

  if (error) throw new Error(error.message);

  return { id: data.id, ai_response: aiResponse, context_summary: contextSummary };
}

export async function fetchChatHistory(): Promise<ChatMessage[]> {
  const session = await getCurrentSession();
  if (!session?.user) return [];

  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as ChatMessage[];
}

export interface JobRecommendation {
  job_id: string;
  title: string;
  company: string;
  location?: string | null;
  source: string;
  match_score: number;
  matched_skills: string[];
  missing_skills: string[];
  recommendation_reason: string;
  apply_url?: string | null;
}

export async function recommendJobs(_body: {
  role_preference?: string;
  location?: string;
}): Promise<{ recommendations: JobRecommendation[]; message: string }> {
  return {
    recommendations: [],
    message: 'Analyze a resume first. Job API integration can be added via Supabase Edge Functions.',
  };
}

export async function searchJobs(_params: {
  query?: string;
  location?: string;
}): Promise<{ jobs: Array<Record<string, unknown>>; total: number }> {
  return { jobs: [], total: 0 };
}

export async function saveJob(
  job: Omit<JobRecommendation, 'job_id'> & { job_id?: string }
): Promise<JobRecommendation> {
  const session = await getCurrentSession();
  if (!session?.user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('saved_jobs')
    .insert({
      user_id: session.user.id,
      title: job.title,
      company: job.company,
      location: job.location,
      source: job.source,
      match_score: job.match_score,
      matched_skills: job.matched_skills,
      missing_skills: job.missing_skills,
      recommendation_reason: job.recommendation_reason,
      apply_url: job.apply_url,
    })
    .select('*')
    .single();

  if (error) throw new Error(error.message);

  return {
    job_id: data.id,
    title: data.title,
    company: data.company,
    location: data.location,
    source: data.source,
    match_score: Number(data.match_score),
    matched_skills: data.matched_skills ?? [],
    missing_skills: data.missing_skills ?? [],
    recommendation_reason: data.recommendation_reason ?? '',
    apply_url: data.apply_url,
  };
}

export async function fetchSavedJobs(): Promise<JobRecommendation[]> {
  const session = await getCurrentSession();
  if (!session?.user) return [];

  const { data, error } = await supabase
    .from('saved_jobs')
    .select('*')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    job_id: row.id,
    title: row.title,
    company: row.company,
    location: row.location,
    source: row.source,
    match_score: Number(row.match_score),
    matched_skills: row.matched_skills ?? [],
    missing_skills: row.missing_skills ?? [],
    recommendation_reason: row.recommendation_reason ?? '',
    apply_url: row.apply_url,
  }));
}

export async function checkBackendHealth(): Promise<boolean> {
  return isSupabaseConfigured();
}

export { isSupabaseConfigured, onAuthStateChange } from '../../src/lib/supabase.js';
