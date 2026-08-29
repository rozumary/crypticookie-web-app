import React, { useState } from 'react';
import { User, Lock, Mail, Sparkles, X, Cookie } from 'lucide-react';
import { type User as UserType } from '../types/database';
import { db, syncToFirestore } from '../lib/db';
import { sha256 } from '../lib/crypto';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: UserType) => void;
  initialMode?: 'signin' | 'signup';
  canClose?: boolean;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  initialMode = 'signin',
  canClose = true,
}) => {
  const [isRegisterMode, setIsRegisterMode] = useState(initialMode === 'signup');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Sync mode when modal opens or initialMode changes
  React.useEffect(() => {
    setIsRegisterMode(initialMode === 'signup');
    setError(null);
  }, [initialMode, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const hashedPass = await sha256(password);

      if (isRegisterMode) {
        const existing = await db.users.where('email').equals(email.trim().toLowerCase()).first();
        if (existing) {
          setError('An account with this email already exists.');
          setLoading(false);
          return;
        }

        const newUser: UserType = {
          id: 'u_' + Math.random().toString(36).substring(2, 9),
          username: username.trim() || email.split('@')[0] || 'User',
          email: email.trim().toLowerCase(),
          password_hash: hashedPass,
          created_at: new Date().toISOString(),
          immutable: 0,
        };

        await db.users.add(newUser);
        await syncToFirestore('users', newUser.id, newUser);
        onLoginSuccess(newUser);
        onClose();
      } else {
        const user = await db.users.where('email').equals(email.trim().toLowerCase()).first();
        if (!user || user.password_hash !== hashedPass) {
          setError('Invalid email or password credentials.');
          setLoading(false);
          return;
        }

        onLoginSuccess(user);
        onClose();
      }
    } catch (err) {
      console.error('Auth error:', err);
      setError('An error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setLoading(true);
    try {
      let user = await db.users.where('email').equals('test@crypticookie.io').first();
      if (!user) {
        user = {
          id: 'u_auditor_primary',
          username: 'Test Auditor',
          email: 'test@crypticookie.io',
          password_hash: await sha256('test123_secure'),
          created_at: new Date().toISOString(),
          immutable: 0,
        };
        await db.users.add(user);
        await syncToFirestore('users', user.id, user);
      }
      onLoginSuccess(user);
      onClose();
    } catch (err) {
      console.error('Demo login error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#060310]/85 backdrop-blur-md p-4 animate-fadeIn">
      <div className="w-full max-w-md rounded-3xl border border-pink-500/30 bg-[#0c061d] p-6 sm:p-8 shadow-[0_0_50px_rgba(219,39,119,0.15)] space-y-6 relative text-purple-100">
        {canClose && (
          <button
            onClick={onClose}
            className="absolute right-5 top-5 text-purple-300/50 hover:text-pink-400 transition-colors cursor-pointer p-1"
          >
            <X className="h-5 w-5" />
          </button>
        )}

        <div className="text-center space-y-1">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1a082d] text-pink-400 border border-pink-500/30 mb-3 shadow-[0_0_15px_rgba(219,39,119,0.1)]">
            <Cookie className="h-7 w-7 text-pink-400" />
          </div>
          <h2 className="text-xl font-extrabold bg-gradient-to-r from-pink-400 via-purple-300 to-indigo-300 bg-clip-text text-transparent tracking-tight">
            {isRegisterMode ? 'Create Crypticookie Account' : 'Welcome to Crypticookie'}
          </h2>
          <p className="text-xs text-purple-300/60 leading-relaxed max-w-xs mx-auto">
            {isRegisterMode
              ? 'Sign up to record, audit, and securely broadcast cookie consents.'
              : 'Sign in to access your secure consent logs and real-time blockchain ledger.'}
          </p>
        </div>

        {/* Tab switcher: Sign In vs Sign Up */}
        <div className="flex rounded-2xl bg-[#060310] p-1 border border-[#23123a]">
          <button
            type="button"
            onClick={() => {
              setIsRegisterMode(false);
              setError(null);
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              !isRegisterMode
                ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-[0_0_10px_rgba(219,39,119,0.25)]'
                : 'text-purple-300/70 hover:text-white hover:bg-[#160d2e]/40'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setIsRegisterMode(true);
              setError(null);
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              isRegisterMode
                ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-[0_0_10px_rgba(219,39,119,0.25)]'
                : 'text-purple-300/70 hover:text-white hover:bg-[#160d2e]/40'
            }`}
          >
            Sign Up
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-xs font-semibold text-rose-300 animate-pulse">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {isRegisterMode && (
            <div>
              <label className="block text-purple-200/90 font-bold mb-1.5 uppercase tracking-wide text-[10px]">Full Name / Username</label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-pink-400/70" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. Alex Rivera"
                  required={isRegisterMode}
                  className="w-full bg-[#060310] border border-[#23123a] rounded-xl pl-9 pr-3.5 py-2.5 text-purple-100 placeholder-purple-400/20 focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500/30 font-sans transition-all"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-purple-200/90 font-bold mb-1.5 uppercase tracking-wide text-[10px]">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-pink-400/70" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                required
                className="w-full bg-[#060310] border border-[#23123a] rounded-xl pl-9 pr-3.5 py-2.5 text-purple-100 placeholder-purple-400/20 focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500/30 font-sans transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-purple-200/90 font-bold mb-1.5 uppercase tracking-wide text-[10px]">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-pink-400/70" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full bg-[#060310] border border-[#23123a] rounded-xl pl-9 pr-3.5 py-2.5 text-purple-100 placeholder-purple-400/20 focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500/30 font-sans transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 hover:opacity-95 text-white font-extrabold text-xs shadow-[0_0_15px_rgba(219,39,119,0.3)] hover:scale-[1.01] active:scale-95 transition-all cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Processing...' : isRegisterMode ? 'Create Free Account' : 'Sign In'}
          </button>
        </form>

        <div className="relative flex items-center justify-center">
          <div className="border-t border-[#23123a] w-full" />
          <span className="bg-[#0c061d] px-3 text-[10px] text-purple-300/40 font-bold uppercase tracking-wider font-mono">
            or
          </span>
        </div>

        <button
          type="button"
          onClick={handleDemoLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#13092b] hover:bg-[#1a0c3d] border border-pink-500/20 text-xs font-bold text-pink-300 shadow-[0_0_10px_rgba(219,39,119,0.05)] hover:border-pink-500/40 transition-all cursor-pointer"
        >
          <Sparkles className="h-4 w-4 text-pink-400" />
          <span>Quick 1-Click Demo Login</span>
        </button>
      </div>
    </div>
  );
};
