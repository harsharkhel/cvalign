import React, { useState, useEffect } from 'react';
import { PageId } from '../types';
import { Eye, EyeOff, Mail, Lock, User, ShieldAlert } from 'lucide-react';
import {
  checkBackendHealth,
  isSupabaseConfigured,
  loginUser,
  loginWithGoogleOAuth,
  registerUser,
} from '../lib/api';
import { validatePassword } from '../lib/authValidation';

interface LoginProps {
  onNavigate: (page: PageId) => void;
  onLoginSuccess: () => void;
}

const inputClass =
  'w-full rounded-lg pl-10 pr-4 py-3 text-sm text-[#F5F5F5] placeholder:text-white/45 bg-white/[0.06] border border-white/[0.10] focus:outline-none focus:border-white/25 focus:ring-1 focus:ring-white/15 transition-all';

export default function Login({ onNavigate, onLoginSuccess }: LoginProps) {
  const [isSignup, setIsSignup] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isAttemptingLogin, setIsAttemptingLogin] = useState(false);
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);

  useEffect(() => {
    checkBackendHealth().then(setApiOnline);
  }, []);

  const switchToLogin = () => {
    setIsSignup(false);
    setError('');
  };

  const switchToSignup = () => {
    setIsSignup(true);
    setError('');
  };

  const handleGoogleLogin = async () => {
    if (!isSupabaseConfigured()) {
      setError('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.');
      return;
    }
    setIsAttemptingLogin(true);
    setError('');
    try {
      await loginWithGoogleOAuth();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed.');
      setIsAttemptingLogin(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsAttemptingLogin(true);

    try {
      if (!isSupabaseConfigured()) {
        setError('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.');
        return;
      }

      if (isSignup) {
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
        await registerUser(name, email, password);
        onLoginSuccess();
      } else {
        if (!email || !password) {
          setError('Email and password are required.');
          return;
        }
        await loginUser(email, password);
        onLoginSuccess();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Authentication failed.');
    } finally {
      setIsAttemptingLogin(false);
    }
  };

  return (
    <div
      id="login-viewport"
      className="relative min-h-screen w-full bg-[#050505] text-[#F5F5F5] font-sans overflow-hidden flex flex-col"
    >
      {/* Cinematic background */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute right-0 bottom-0 w-[60%] h-full bg-gradient-to-t from-black via-transparent to-transparent opacity-60" />
        <div className="absolute right-[-10%] top-[-20%] w-[800px] h-[1200px] bg-gradient-to-br from-[#1A1A1A] to-transparent transform -rotate-12 blur-3xl opacity-30" />
        <div className="absolute right-[10%] bottom-0 w-[1px] h-full bg-white/10" />
        <div className="absolute right-[30%] bottom-0 w-[1px] h-[80%] bg-white/5" />
        <div className="absolute right-[50%] bottom-0 w-[1px] h-[60%] bg-white/5" />
        <div className="absolute bottom-[20%] right-0 w-full h-[1px] bg-white/10" />
      </div>

      {/* Faded ALIGN CV typography */}
      <div className="absolute inset-0 flex items-center justify-center z-0 pointer-events-none">
        <h1 className="text-[22vw] font-black text-white/[0.012] tracking-tighter select-none whitespace-nowrap blur-[0.5px]">
          ALIGN CV
        </h1>
      </div>

      {/* Grain overlay */}
      <div className="fixed inset-0 pointer-events-none z-[1] bg-image-grain opacity-[0.04]" />

      {/* Top nav — logo center, auth toggles right */}
      <nav className="relative z-10 flex items-center justify-center px-6 md:px-12 py-8 w-full">
        <div className="absolute left-6 md:left-12 w-8" aria-hidden />
        <div className="flex flex-col items-center cursor-pointer" onClick={() => onNavigate('login')}>
          <span className="text-2xl font-serif tracking-tight leading-none flex items-center gap-1.5">
            CVAlign
            <span className="text-[10px] bg-white/10 text-white px-1.5 py-0.5 rounded font-sans tracking-wide not-italic">
              AI
            </span>
          </span>
          <span className="text-[10px] tracking-[0.4em] uppercase font-bold text-white/40 mt-1">
            Intelligence
          </span>
        </div>
        <div className="absolute right-6 md:right-12 flex items-center gap-1">
          <button
            type="button"
            onClick={switchToLogin}
            className={`text-[10px] uppercase tracking-[0.2em] font-semibold px-4 py-2 rounded-md transition-all ${
              !isSignup
                ? 'text-white bg-white/10'
                : 'text-white/45 hover:text-white/70'
            }`}
          >
            Login
          </button>
          <button
            type="button"
            onClick={switchToSignup}
            className={`text-[10px] uppercase tracking-[0.2em] font-semibold px-4 py-2 rounded-md transition-all ${
              isSignup
                ? 'text-white bg-white/10'
                : 'text-white/45 hover:text-white/70'
            }`}
          >
            Sign Up
          </button>
        </div>
      </nav>

      {/* Centered intro + login card */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 pb-12">
        <div className="text-center max-w-lg mb-10">
          <div className="w-12 h-[1px] bg-white/30 mx-auto mb-6" />
          <h2 className="text-3xl md:text-4xl font-serif leading-[1.15] mb-4 italic text-white font-light">
            {isSignup
              ? 'Build your ATS-grade resume profiles.'
              : 'Refine your impact with AI analysis.'}
          </h2>
          <p className="text-[#A3A3A3] text-sm md:text-base leading-relaxed">
            {isSignup
              ? 'Join CVAlign AI and start aligning your resume with precision intelligence.'
              : 'Analyze your resume with ATS-grade intelligence. Turn documents into high-performance career assets.'}
          </p>
        </div>

        {/* Glassmorphism login card */}
        <div
          className="w-full max-w-[420px] rounded-2xl p-8 md:p-10"
          style={{
            background: 'rgba(8, 8, 8, 0.35)',
            backdropFilter: 'blur(18px)',
            WebkitBackdropFilter: 'blur(18px)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            boxShadow:
              'inset 0 1px 0 0 rgba(255,255,255,0.04), 0 0 48px rgba(0,0,0,0.45), 0 0 1px rgba(255,255,255,0.03)',
          }}
        >
          {!isSignup && (
            <div className="mb-6 text-center">
              <h3 className="text-xs uppercase tracking-[0.3em] font-semibold text-white/80 mb-1">
                Welcome Back
              </h3>
              <p className="text-xs text-white/40">Access your CVAlign dashboard to continue.</p>
            </div>
          )}

          {isSignup && (
            <div className="mb-6 text-center">
              <h3 className="text-xs uppercase tracking-[0.3em] font-semibold text-white/80 mb-1">
                Create Account
              </h3>
              <p className="text-xs text-white/40">Join our predictive recruitment workspace.</p>
            </div>
          )}

          {error && (
            <div className="mb-5 p-3 bg-[#EF4444]/10 border border-[#EF4444]/25 rounded-lg text-xs text-[#EF4444] flex items-center gap-2">
              <ShieldAlert size={14} className="flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Signup-only: name + confirm password */}
            {isSignup && (
              <div className="space-y-1.5">
                <label className="text-[9px] uppercase tracking-[0.25em] text-white/50 ml-1 block">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3.5 text-white/30" size={14} />
                  <input
                    type="text"
                    required={isSignup}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={inputClass}
                    placeholder="John Doe"
                  />
                </div>
              </div>
            )}

            {/* 1. Email */}
            <div className="space-y-1.5">
              <label className="text-[9px] uppercase tracking-[0.25em] text-white/50 ml-1 block">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3.5 text-white/30" size={14} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
                  placeholder="name@firm.com"
                />
              </div>
            </div>

            {/* 2. Password */}
            <div className="space-y-1.5">
              <label className="text-[9px] uppercase tracking-[0.25em] text-white/50 ml-1 block">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 text-white/30" size={14} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`${inputClass} pr-10`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3.5 text-white/30 hover:text-white/60 transition-colors"
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {isSignup && (
              <div className="space-y-1.5">
                <label className="text-[9px] uppercase tracking-[0.25em] text-white/50 ml-1 block">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3.5 text-white/30" size={14} />
                  <input
                    type="password"
                    required={isSignup}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={inputClass}
                    placeholder="••••••••"
                  />
                </div>
              </div>
            )}

            {/* 3. Forgot password (login mode only) */}
            {!isSignup && (
              <div className="flex justify-end -mt-1">
                <button
                  type="button"
                  className="text-[10px] uppercase tracking-[0.15em] text-white/40 hover:text-white/70 transition-colors"
                  onClick={() => setError('Password reset will be available soon via Supabase Auth.')}
                >
                  Forgot password?
                </button>
              </div>
            )}

            {/* 4. LOGIN / Register button */}
            <button
              type="submit"
              disabled={isAttemptingLogin}
              className="w-full bg-white text-black text-[10px] uppercase tracking-[0.2em] font-bold py-4 rounded-lg hover:bg-neutral-200 transition-colors shadow-[0_0_20px_rgba(255,255,255,0.08)] disabled:opacity-50 disabled:cursor-wait"
            >
              {isAttemptingLogin
                ? 'Connecting...'
                : isSignup
                  ? 'Register Credentials'
                  : 'Login'}
            </button>

            {/* 5. CREATE NEW ACCOUNT — directly below Login (login mode only) */}
            {!isSignup && (
              <button
                type="button"
                onClick={switchToSignup}
                disabled={isAttemptingLogin}
                className="w-full mt-3 py-3.5 rounded-lg text-[10px] uppercase tracking-[0.2em] font-semibold text-[#F5F5F5] bg-transparent border border-white/[0.18] hover:bg-white/[0.06] hover:shadow-[0_0_24px_rgba(255,255,255,0.06)] transition-all disabled:opacity-50"
              >
                Create New Account
              </button>
            )}

            {isSignup && (
              <button
                type="button"
                onClick={switchToLogin}
                disabled={isAttemptingLogin}
                className="w-full mt-3 py-3.5 rounded-lg text-[10px] uppercase tracking-[0.2em] font-semibold text-[#F5F5F5] bg-transparent border border-white/[0.18] hover:bg-white/[0.06] hover:shadow-[0_0_24px_rgba(255,255,255,0.06)] transition-all disabled:opacity-50"
              >
                Back to Login
              </button>
            )}

            {/* 6. OR divider */}
            <div className="relative py-2 flex items-center justify-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/[0.06]" />
              </div>
              <span className="relative z-10 px-4 text-[8px] tracking-[0.2em] uppercase text-white/30 bg-transparent">
                Or
              </span>
            </div>

            {/* 7. Continue with Google */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isAttemptingLogin}
              className="w-full border border-white/[0.10] rounded-lg py-3 flex items-center justify-center gap-3 text-white/90 hover:bg-white/[0.05] hover:border-white/[0.15] transition-all disabled:opacity-50"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              <span className="text-[10px] uppercase tracking-widest font-semibold">
                Continue with Google
              </span>
            </button>
          </form>
        </div>
      </main>

      <footer className="relative z-10 px-6 py-6 border-t border-white/[0.04] w-full max-w-7xl mx-auto">
        <span
          className={`text-[10px] font-mono uppercase tracking-widest ${
            apiOnline ? 'text-[#22C55E]/80' : 'text-[#EF4444]/80'
          }`}
        >
          {apiOnline === null
            ? 'Checking Supabase...'
            : apiOnline
              ? 'Supabase configured'
              : 'Supabase not configured'}
        </span>
      </footer>
    </div>
  );
}
