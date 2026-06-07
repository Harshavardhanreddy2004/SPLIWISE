import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { UserPlus, Eye, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';

interface SignupProps {
  onNavigate: (view: string) => void;
  showToast: (msg: string, type: 'success' | 'error') => void;
}

export const Signup: React.FC<SignupProps> = ({ onNavigate, showToast }) => {
  const { signUp } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    if (name.trim().length < 2) {
      showToast('Please enter your full name.', 'error');
      return;
    }

    if (password.length < 6) {
      showToast('Password must be at least 6 characters.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      await signUp(email.trim(), password, name.trim());
      showToast('Account created successfully! Check your email for confirmation.', 'success');
      onNavigate('login');
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Failed to create account.', 'error');
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
      <div className="w-16 h-16 bg-purple-500/10 rounded-2xl mx-auto flex items-center justify-center mb-4 border border-purple-500/20">
        <UserPlus className="w-8 h-8 text-purple-400" />
      </div>
      <h2 className="text-2xl font-semibold tracking-tight">Create Account</h2>
      <p className="text-sm text-zinc-400 dark:text-zinc-400 mt-1 mb-6">Get started with minimalist expense tracking</p>

      <form onSubmit={handleSubmit} className="space-y-4 text-left">
        <div>
          <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5 ml-1">Full Name</label>
          <input
            type="text"
            name="name"
            autoComplete="name"
            placeholder="Sarah Jenkins"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full glass-input rounded-xl px-4 py-3 text-sm placeholder-zinc-500"
            required
            disabled={submitting}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5 ml-1">Email Address</label>
          <input
            type="email"
            name="email"
            autoComplete="email"
            placeholder="name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full glass-input rounded-xl px-4 py-3 text-sm placeholder-zinc-500"
            required
            disabled={submitting}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5 ml-1">Password</label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              name="password"
              autoComplete="new-password"
              placeholder="Create a password (min 6 chars)"
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
          className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-medium text-sm rounded-xl py-3 mt-2 hover:opacity-90 transition active:scale-[0.98]"
          disabled={submitting}
        >
          {submitting ? 'Registering...' : 'Agree & Register'}
        </button>
      </form>
      <div className="mt-6 text-sm text-zinc-500 dark:text-zinc-400">
        Already registered?{' '}
        <button onClick={() => onNavigate('login')} className="text-indigo-400 hover:underline font-medium">
          Log in
        </button>
      </div>
    </motion.div>
  );
};
