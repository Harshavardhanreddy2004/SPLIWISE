import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Lock, Eye, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';

interface LoginProps {
  onNavigate: (view: string) => void;
  showToast: (msg: string, type: 'success' | 'error') => void;
}

export const Login: React.FC<LoginProps> = ({ onNavigate, showToast }) => {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    try {
      await signIn(email.trim(), password);
      showToast('Logged in successfully!', 'success');
      onNavigate('dashboard');
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Invalid email or password.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, filter: 'blur(4px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      exit={{ opacity: 0, y: -12, filter: 'blur(4px)' }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="glass rounded-3xl p-8 text-center shadow-2xl shadow-black/40 my-8 max-w-xl mx-auto border border-white/5"
    >
      <div className="w-16 h-16 bg-indigo-500/10 rounded-2xl mx-auto flex items-center justify-center mb-4 border border-indigo-500/20">
        <Lock className="w-8 h-8 text-indigo-400" />
      </div>
      <h2 className="text-2xl font-semibold tracking-tight">Welcome Back</h2>
      <p className="text-sm text-zinc-400 dark:text-zinc-400 mt-1 mb-6">Sign in to manage your shared balances</p>

      <form onSubmit={handleSubmit} className="space-y-4 text-left">
        <div>
          <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5 ml-1">Email Address</label>
          <input
            type="email"
            name="email"
            autoComplete="username"
            placeholder="name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full glass-input rounded-xl px-4 py-3 text-sm placeholder-zinc-500"
            required
            disabled={submitting}
          />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1.5 ml-1">
            <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">Password</label>
            <button
              type="button"
              onClick={() => onNavigate('forgot-password')}
              className="text-xs text-indigo-400 hover:underline"
              tabIndex={-1}
            >
              Forgot?
            </button>
          </div>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              name="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full glass-input rounded-xl pl-4 pr-10 py-3 text-sm placeholder-zinc-500"
              required
              disabled={submitting}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-3.5 text-zinc-500 hover:text-zinc-300"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
        <button
          type="submit"
          className="w-full bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 font-medium text-sm rounded-xl py-3 mt-2 hover:opacity-90 dark:hover:bg-zinc-200 transition active:scale-[0.98]"
          disabled={submitting}
        >
          {submitting ? 'Signing In...' : 'Sign In'}
        </button>
      </form>
      <div className="mt-6 text-sm text-zinc-500 dark:text-zinc-400">
        Don't have an account?{' '}
        <button onClick={() => onNavigate('signup')} className="text-indigo-400 hover:underline font-medium">
          Sign up
        </button>
      </div>
    </motion.div>
  );
};
