import React, { useEffect } from 'react';
import { AlertCircle, CheckCircle, X } from 'lucide-react';

interface ToastProps {
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed top-16 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-sm px-4 animate-fade-in">
      <div
        className={`glass rounded-2xl p-4 flex items-center justify-between shadow-2xl border ${
          type === 'success'
            ? 'border-emerald-500/30 bg-emerald-950/30 dark:bg-emerald-950/20 text-emerald-200'
            : 'border-rose-500/30 bg-rose-950/30 dark:bg-rose-950/20 text-rose-200'
        }`}
      >
        <div className="flex items-center gap-3">
          {type === 'success' ? (
            <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
          )}
          <p className="text-xs font-medium">{message}</p>
        </div>
        <button
          onClick={onClose}
          className="text-zinc-400 hover:text-zinc-200 ml-3 p-1 rounded-lg hover:bg-white/5 transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
export default Toast;
