import React, { useState } from 'react';
import { PageId } from '../types';
import { ShieldAlert, User, Mail, Lock } from 'lucide-react';
import { isSupabaseConfigured, loginWithGoogleOAuth, registerUser } from '../lib/api';
import { validatePassword } from '../lib/authValidation';

interface SignupProps {
  onNavigate: (page: PageId) => void;
  onSignupSuccess: () => void;
}

export default function Signup({ onNavigate, onSignupSuccess }: SignupProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSupabaseConfigured()) {
      setError('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.');
      return;
    }
    if (!name || !email || !password || !confirmPassword) {
      setError('All fields are required.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }
    setError('');
    setIsSubmitting(true);
    try {
      await registerUser(name, email, password);
      onSignupSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    if (!isSupabaseConfigured()) {
      setError('Supabase is not configured.');
      return;
    }
    try {
      await loginWithGoogleOAuth();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed.');
    }
  };

  return (
    <div className="relative min-h-screen w-full bg-[#050505] text-[#F5F5F5] flex flex-col justify-between">
      <nav className="relative z-10 px-6 py-8 max-w-7xl mx-auto w-full flex justify-between">
        <span className="text-2xl font-serif">CVAlign</span>
        <button onClick={() => onNavigate('login')} className="text-xs uppercase tracking-widest text-white/60">Login</button>
      </nav>

      <main className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-md bg-white/[0.03] border border-white/[0.08] rounded-2xl p-8">
          <h3 className="text-xs uppercase tracking-[0.3em] text-white/80 mb-6">Create Account</h3>
          {error && (
            <div className="mb-4 p-3 bg-[#EF4444]/15 border border-[#EF4444]/30 rounded-lg text-xs text-[#EF4444] flex gap-2">
              <ShieldAlert size={14} /><span>{error}</span>
            </div>
          )}
          <form onSubmit={handleSignup} className="space-y-4">
            <div className="relative">
              <User className="absolute left-3 top-3 text-white/25" size={14} />
              <input type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg pl-10 pr-4 py-2.5 text-sm text-white" />
            </div>
            <div className="relative">
              <Mail className="absolute left-3 top-3 text-white/25" size={14} />
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg pl-10 pr-4 py-2.5 text-sm text-white" />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-3 text-white/25" size={14} />
              <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg pl-10 pr-4 py-2.5 text-sm text-white" />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-3 text-white/25" size={14} />
              <input type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm password" className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg pl-10 pr-4 py-2.5 text-sm text-white" />
            </div>
            <button type="submit" disabled={isSubmitting} className="w-full bg-white text-black py-3 rounded-lg text-xs uppercase tracking-widest font-bold disabled:opacity-50">
              {isSubmitting ? 'Creating...' : 'Register'}
            </button>
            <button type="button" onClick={handleGoogle} className="w-full border border-white/10 py-3 rounded-lg text-xs uppercase tracking-widest">
              Continue with Google
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
