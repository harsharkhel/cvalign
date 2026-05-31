import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '[CVAlign] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Add them to .env and restart Vite.'
  );
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '', {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

export function isSupabaseConfigured() {
  return Boolean(supabaseUrl && supabaseAnonKey);
}

export async function signUpWithEmail(name, email, password) {
  const { data, error } = await supabase.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
    options: {
      data: { name: name.trim(), full_name: name.trim() },
    },
  });
  if (error) throw new Error(error.message);

  if (data.user) {
    await upsertProfile(data.user, name.trim(), 'email');
  }
  return data;
}

export async function signInWithEmail(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function signOutUser() {
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(error.message);
}

export async function signInWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/`,
    },
  });
  if (error) throw new Error(error.message);
}

export async function getCurrentSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new Error(error.message);
  return data.session;
}

export async function getAccessToken() {
  const session = await getCurrentSession();
  return session?.access_token ?? null;
}

export async function upsertProfile(user, name, authProvider = 'email') {
  const payload = {
    id: user.id,
    name: name || user.user_metadata?.name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
    email: user.email || '',
    avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
    auth_provider: authProvider,
    dashboard_data: {},
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from('profiles').upsert(payload, { onConflict: 'id' });
  if (error) {
    console.warn('[CVAlign] Profile upsert:', error.message);
  }
  return payload;
}

export async function fetchProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function ensureProfileForUser(user) {
  const existing = await fetchProfile(user.id);
  if (existing) return existing;

  const provider = user.app_metadata?.provider === 'google' ? 'google' : 'email';
  return upsertProfile(
    user,
    user.user_metadata?.name || user.user_metadata?.full_name,
    provider
  );
}

export function onAuthStateChange(callback) {
  return supabase.auth.onAuthStateChange((_event, session) => {
    callback(session);
  });
}
