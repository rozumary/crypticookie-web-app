import React, { useState } from 'react';
import { User, Lock, Mail, Sparkles, X, Cookie } from 'lucide-react';
import { type User as UserType } from '../types/database';
import { db } from '../lib/db';
import { sha256 } from '../lib/crypto';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: UserType) => void;
  initialMode?: 'signin' | 'signup';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  initialMode = 'signin',
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
        };

        await db.users.add(newUser);
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
      let user = await db.users.toCollection().first();
      if (!user) {
        user = {
          id: 'u_evaluator_' + Math.random().toString(36).substring(2, 9),
          username: 'Guest Evaluator',
          email: 'guest@crypticookie.local',
          password_hash: await sha256('guest123_secure'),
          created_at: new Date().toISOString(),
        };
        await db.users.add(user);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="w-full max-w-md rounded-2xl border border-blue-900/40 bg-[#0b1026] p-6 sm:p-8 shadow-2xl space-y-6 relative">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-blue-400 hover:text-white transition-colors cursor-pointer p-1"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="text-center space-y-1">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-blue-600 text-white border border-violet-400/40 mb-3 shadow-lg shadow-violet-950/50">
            <Cookie className="h-7 w-7 text-amber-300" />
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            {isRegisterMode ? 'Create Your Account' : 'Welcome Back'}
          </h2>
          <p className="text-xs text-blue-200/70">
            {isRegisterMode
              ? 'Sign up to record and audit cryptographic cookie consents'
              : 'Sign in to access your consent logs and blockchain explorer'}
          </p>
        </div>

        {/* Tab switcher: Sign In vs Sign Up */}
        <div className="flex rounded-xl bg-[#060a17] p-1 border border-blue-900/50">
          <button
            type="button"
            onClick={() => {
              setIsRegisterMode(false);
              setError(null);
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              !isRegisterMode
                ? 'bg-gradient-to-r from-violet-600 to-blue-600 text-white shadow-sm'
                : 'text-blue-300/70 hover:text-white'
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
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              isRegisterMode
                ? 'bg-gradient-to-r from-violet-600 to-blue-600 text-white shadow-sm'
                : 'text-blue-300/70 hover:text-white'
            }`}
          >
            Sign Up
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {isRegisterMode && (
            <div>
              <label className="block text-blue-200 font-medium mb-1.5">Full Name / Username</label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-blue-400/50" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. Alex Rivera"
                  required={isRegisterMode}
                  className="w-full bg-[#060a17] border border-blue-900/50 rounded-xl pl-9 pr-3.5 py-2.5 text-white placeholder-blue-400/30 focus:outline-none focus:border-violet-500 font-sans"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-blue-200 font-medium mb-1.5">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-blue-400/50" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                required
                className="w-full bg-[#060a17] border border-blue-900/50 rounded-xl pl-9 pr-3.5 py-2.5 text-white placeholder-blue-400/30 focus:outline-none focus:border-violet-500 font-sans"
              />
            </div>
          </div>

          <div>
            <label className="block text-blue-200 font-medium mb-1.5">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-blue-400/50" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full bg-[#060a17] border border-blue-900/50 rounded-xl pl-9 pr-3.5 py-2.5 text-white placeholder-blue-400/30 focus:outline-none focus:border-violet-500 font-sans"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white font-semibold shadow-md shadow-violet-950/50 transition-all cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Processing...' : isRegisterMode ? 'Create Free Account' : 'Sign In'}
          </button>
        </form>

        <div className="relative flex items-center justify-center">
          <div className="border-t border-blue-900/40 w-full" />
          <span className="bg-[#0b1026] px-2 text-[10px] text-blue-400/50 uppercase tracking-wider font-mono">
            or
          </span>
        </div>

        <button
          type="button"
          onClick={handleDemoLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-blue-950/60 hover:bg-blue-900/60 border border-blue-800/40 text-xs font-semibold text-blue-200 hover:text-white transition-colors cursor-pointer"
        >
          <Sparkles className="h-4 w-4 text-amber-400" />
          <span>Quick 1-Click Demo Login</span>
        </button>
      </div>
    </div>
  );
};
