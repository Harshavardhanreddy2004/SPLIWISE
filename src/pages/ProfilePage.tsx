import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Copy, Bell, CreditCard, LogOut, Check, Edit2, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';

interface ProfilePageProps {
  onNavigate: (view: string) => void;
  showToast: (msg: string, type: 'success' | 'error') => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({
  onNavigate,
  showToast,
}) => {
  const { profile, signOut, updateProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(profile?.name || '');
  const [updating, setUpdating] = useState(false);

  const handleCopy = () => {
    if (!profile) return;
    navigator.clipboard.writeText(profile.expense_id).then(() => {
      showToast('SplitID code copied to clipboard!', 'success');
    });
  };

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || updating) return;

    if (!name.trim()) {
      showToast('Name cannot be empty.', 'error');
      return;
    }

    setUpdating(true);
    try {
      await updateProfile({ name: name.trim() });
      showToast('Profile name updated!', 'success');
      setIsEditing(false);
    } catch (err) {
      console.error(err);
      showToast('Failed to update name.', 'error');
    } finally {
      setUpdating(false);
    }
  };

  const handleSignOut = async () => {
    if (window.confirm('Are you sure you want to sign out?')) {
      try {
        await signOut();
        showToast('Logged out successfully.', 'success');
        onNavigate('login');
      } catch (err) {
        console.error(err);
        showToast('Failed to sign out.', 'error');
      }
    }
  };

  if (!profile) {
    return (
      <div className="text-center py-20 animate-fade-in">
        <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin mx-auto mb-4" />
        <span className="text-xs text-zinc-500">Loading user profile...</span>
      </div>
    );
  }

  const getInitials = (n: string) => {
    return n
      .split(' ')
      .map((item) => item[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, filter: 'blur(4px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      exit={{ opacity: 0, y: -12, filter: 'blur(4px)' }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-6 pb-10 max-w-3xl mx-auto"
    >
      <div className="glass rounded-2xl p-6 text-center shadow-xl space-y-6 border">
        {/* Profile Card Header */}
        <div className="space-y-3">
          <div className="relative w-20 h-20 mx-auto">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.name}
                className="w-20 h-20 rounded-full border-2 border-white/20 object-cover shadow-lg"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-zinc-800 border-2 border-white/10 flex items-center justify-center text-xl font-bold text-white shadow-lg">
                {getInitials(profile.name)}
              </div>
            )}
            <span className="absolute bottom-0 right-0 w-5 h-5 bg-emerald-500 border-4 border-zinc-950 dark:border-zinc-900 rounded-full"></span>
          </div>

          <div className="space-y-1">
            {isEditing ? (
              <form onSubmit={handleUpdateName} className="flex items-center justify-center gap-2 max-w-[240px] mx-auto">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="glass-input rounded-lg px-2 py-1 text-sm text-center font-bold"
                  disabled={updating}
                  required
                />
                <button
                  type="submit"
                  className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20"
                  disabled={updating}
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
              </form>
            ) : (
              <div className="flex items-center justify-center gap-2">
                <h2 className="text-xl font-bold tracking-tight text-zinc-850 dark:text-zinc-100">
                  {profile.name}
                </h2>
                <button
                  onClick={() => {
                    setName(profile.name);
                    setIsEditing(true);
                  }}
                  className="text-zinc-400 hover:text-white"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            <p className="text-xs text-zinc-500 dark:text-zinc-400">{profile.email}</p>
          </div>
        </div>

        {/* Public Expense ID Banner Card */}
        <div className="glass rounded-xl p-4 bg-white/[0.01] flex items-center justify-between border border-white/5 text-left shadow-inner">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 block mb-0.5">
              Your Personal SplitID
            </span>
            <span className="text-sm font-mono font-bold tracking-wide text-zinc-800 dark:text-zinc-200">
              {profile.expense_id}
            </span>
          </div>
          <button
            onClick={handleCopy}
            className="h-9 px-3 glass rounded-lg flex items-center justify-center gap-1.5 text-xs text-indigo-400 font-semibold active:scale-95 transition-all shadow"
          >
            <Copy className="w-3.5 h-3.5" /> Copy Code
          </button>
        </div>

        {/* Menu Actions */}
        <div className="text-left divide-y divide-white/5 glass rounded-xl overflow-hidden text-sm border shadow-md">
          <div className="p-3.5 flex justify-between items-center cursor-not-allowed text-zinc-400 dark:text-zinc-500 opacity-60">
            <div className="flex items-center gap-2.5">
              <Bell className="w-4 h-4" /> Notification Settings
            </div>
            <span className="text-[9px] uppercase font-semibold">Soon</span>
          </div>
          <div className="p-3.5 flex justify-between items-center cursor-not-allowed text-zinc-400 dark:text-zinc-500 opacity-60">
            <div className="flex items-center gap-2.5">
              <CreditCard className="w-4 h-4" /> Payment Methods
            </div>
            <span className="text-[9px] uppercase font-semibold">Soon</span>
          </div>
          <div
            onClick={handleSignOut}
            className="p-3.5 flex justify-between items-center cursor-pointer hover:bg-rose-500/5 text-rose-500 dark:text-rose-400 transition"
          >
            <div className="flex items-center gap-2.5 font-semibold">
              <LogOut className="w-4 h-4" /> Sign Out
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
export default ProfilePage;
