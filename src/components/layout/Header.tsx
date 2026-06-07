import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Layers, Sun, Moon } from 'lucide-react';

interface HeaderProps {
  onNavigate: (view: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ onNavigate }) => {
  const { profile } = useAuth();
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'dark' | 'light' | null;
    const initialTheme = savedTheme || 'dark';
    setTheme(initialTheme);
    document.body.classList.remove('dark', 'light');
    document.body.classList.add(initialTheme);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    document.body.classList.remove('dark', 'light');
    document.body.classList.add(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  };

  return (
    <header className="sticky top-0 z-40 w-full glass border-b border-white/5 px-4 py-3 mb-6 transition-all duration-300">
      <div className="max-w-3xl mx-auto flex items-center justify-between">
        {/* Logo */}
        <div
          onClick={() => onNavigate('dashboard')}
          className="flex items-center gap-2 cursor-pointer group"
        >
          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition">
            <Layers className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-xl tracking-tight bg-gradient-to-r from-zinc-100 to-zinc-400 dark:from-white dark:to-zinc-400 bg-clip-text text-transparent">
            SplitFlow
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          {/* Theme Switcher */}
          <button
            onClick={toggleTheme}
            className="h-9 w-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition active:scale-95"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400 animate-pulse" />
            ) : (
              <Moon className="w-4 h-4 text-indigo-500" />
            )}
          </button>

          {/* User Profile Trigger */}
          {profile && (
            <button
              onClick={() => onNavigate('profile')}
              className="h-9 w-9 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center overflow-hidden hover:ring-2 hover:ring-indigo-500/50 transition active:scale-95 text-white"
            >
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-xs font-bold">{getInitials(profile.name)}</span>
              )}
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
