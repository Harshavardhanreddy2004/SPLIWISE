import React, { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { KeyRound } from 'lucide-react';

interface ForgotPasswordProps {
  onNavigate: (view: string) => void;
  showToast: (msg: string, type: 'success' | 'error') => void;
}

export const ForgotPassword: React.FC<ForgotPasswordProps> = ({ onNavigate, showToast }) => {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}`,
      });
      if (error) throw error;
      showToast('Password reset link sent! Check your inbox.', 'success');
      onNavigate('login');
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Failed to send recovery email.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="glass rounded-2xl p-6 text-center shadow-2xl shadow-black/40 my-8 max-w-md mx-auto animate-fade-in border">
      <div className="w-16 h-16 bg-amber-500/10 rounded-2xl mx-auto flex items-center justify-center mb-4 border border-amber-500/20">
        <KeyRound className="w-8 h-8 text-amber-400" />
      </div>
      <h2 className="text-2xl font-semibold tracking-tight">Reset Password</h2>
      <p className="text-sm text-zinc-400 dark:text-zinc-400 mt-1 mb-6">
        Enter your email to receive recovery instructions
      </p>

      <form onSubmit={handleSubmit} className="space-y-4 text-left">
        <div>
          <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5 ml-1">Email Address</label>
          <input
            type="email"
            placeholder="name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full glass-input rounded-xl px-4 py-3 text-sm placeholder-zinc-500"
            required
            disabled={submitting}
          />
        </div>
        <button
          type="submit"
          className="w-full bg-white text-zinc-950 dark:bg-white dark:text-zinc-950 font-medium text-sm rounded-xl py-3 mt-2 hover:opacity-90 dark:hover:bg-zinc-200 transition active:scale-[0.98]"
          disabled={submitting}
        >
          {submitting ? 'Sending Link...' : 'Send Recovery Link'}
        </button>
      </form>
      <div className="mt-6 text-sm text-zinc-500 dark:text-zinc-400">
        Remember your password?{' '}
        <button onClick={() => onNavigate('login')} className="text-indigo-400 hover:underline font-medium">
          Log in
        </button>
      </div>
    </div>
  );
};
