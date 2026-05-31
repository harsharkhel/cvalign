import type { Session, User } from '@supabase/supabase-js';

export const supabase: import('@supabase/supabase-js').SupabaseClient;

export function isSupabaseConfigured(): boolean;
export function signUpWithEmail(name: string, email: string, password: string): Promise<unknown>;
export function signInWithEmail(email: string, password: string): Promise<unknown>;
export function signOutUser(): Promise<void>;
export function signInWithGoogle(): Promise<void>;
export function getCurrentSession(): Promise<Session | null>;
export function getAccessToken(): Promise<string | null>;
export function upsertProfile(user: User, name: string, authProvider?: string): Promise<unknown>;
export function fetchProfile(userId: string): Promise<Record<string, unknown> | null>;
export function ensureProfileForUser(user: User): Promise<unknown>;
export function onAuthStateChange(callback: (session: Session | null) => void): { data: { subscription: { unsubscribe: () => void } } };
