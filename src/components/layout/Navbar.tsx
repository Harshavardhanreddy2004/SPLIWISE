import React from 'react';
import { Home, Users, Plus, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface NavbarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  onAddExpenseClick: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onNavigate,
  onAddExpenseClick,
}) => {
  const { user } = useAuth();

  // Do not render navbar if user is not authenticated
  if (!user) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 glass border-t border-white/5 py-2 px-6 shadow-2xl">
      <div className="max-w-3xl mx-auto flex items-center justify-between">
        {/* Home / Dashboard */}
        <button
          onClick={() => onNavigate('dashboard')}
          className={`flex flex-col items-center gap-1 transition-all group duration-200 ${
            currentView === 'dashboard'
              ? 'text-indigo-400 font-semibold'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Home className="w-5 h-5 group-hover:scale-110 transition" />
          <span className="text-[10px] font-medium tracking-wide">Home</span>
        </button>

        {/* Groups List */}
        <button
          onClick={() => onNavigate('groups-list')}
          className={`flex flex-col items-center gap-1 transition-all group duration-200 ${
            currentView === 'groups-list' || currentView === 'group-details' || currentView === 'create-group'
              ? 'text-indigo-400 font-semibold'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Users className="w-5 h-5 group-hover:scale-110 transition" />
          <span className="text-[10px] font-medium tracking-wide">Groups</span>
        </button>

        {/* Center Add Expense Button */}
        <button
          onClick={onAddExpenseClick}
          className="flex flex-col items-center gap-1 text-zinc-400 hover:text-white transition group relative -top-4"
          aria-label="Add shared expense"
        >
          <div className="w-12 h-12 bg-white dark:bg-zinc-100 rounded-full flex items-center justify-center shadow-lg shadow-white/10 hover:shadow-indigo-500/20 text-zinc-950 hover:scale-105 active:scale-95 transition-all duration-200">
            <Plus className="w-6 h-6" />
          </div>
        </button>

        {/* Profile */}
        <button
          onClick={() => onNavigate('profile')}
          className={`flex flex-col items-center gap-1 transition-all group duration-200 ${
            currentView === 'profile'
              ? 'text-indigo-400 font-semibold'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <User className="w-5 h-5 group-hover:scale-110 transition" />
          <span className="text-[10px] font-medium tracking-wide">Profile</span>
        </button>
      </div>
    </nav>
  );
};
