import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PlusCircle, RefreshCw, Trash2, CheckCircle2, UserPlus, UserMinus, Calendar } from 'lucide-react';
import type { Activity } from '../../types';
import { formatCurrency } from '../../utils/expense';

interface ActivityFeedProps {
  activities: Activity[];
  loading?: boolean;
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({ activities, loading }) => {
  const getActionDetails = (act: Activity) => {
    const actorName = act.profile?.name || 'Someone';
    const timeStr = new Date(act.created_at).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    switch (act.action_type) {
      case 'expense_created':
        return {
          icon: <PlusCircle className="w-4 h-4 text-indigo-400" />,
          message: (
            <span>
              <strong className="text-zinc-200">{actorName}</strong> logged expense{' '}
              <span className="text-indigo-400 font-medium">"{act.metadata.expense_title}"</span> of{' '}
              <strong className="text-emerald-400">{formatCurrency(act.metadata.amount || 0)}</strong>
            </span>
          ),
          time: timeStr,
        };
      case 'expense_updated':
        return {
          icon: <RefreshCw className="w-4 h-4 text-amber-400" />,
          message: (
            <span>
              <strong className="text-zinc-200">{actorName}</strong> updated expense{' '}
              <span className="text-zinc-300 font-medium">"{act.metadata.expense_title}"</span> to{' '}
              <strong className="text-zinc-100">{formatCurrency(act.metadata.amount || 0)}</strong>
            </span>
          ),
          time: timeStr,
        };
      case 'expense_deleted':
        return {
          icon: <Trash2 className="w-4 h-4 text-rose-400" />,
          message: (
            <span>
              <strong className="text-zinc-200">{actorName}</strong> deleted expense{' '}
              <span className="text-zinc-400 line-through">"{act.metadata.expense_title}"</span> of{' '}
              <strong>{formatCurrency(act.metadata.amount || 0)}</strong>
            </span>
          ),
          time: timeStr,
        };
      case 'settlement_created':
        return {
          icon: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
          message: (
            <span>
              <strong className="text-zinc-200">{act.metadata.payer_name}</strong> settled up with{' '}
              <strong className="text-indigo-400">{act.metadata.payee_name}</strong> for{' '}
              <strong className="text-emerald-400">{formatCurrency(act.metadata.amount || 0)}</strong>
            </span>
          ),
          time: timeStr,
        };
      case 'member_joined':
        return {
          icon: <UserPlus className="w-4 h-4 text-emerald-400" />,
          message: (
            <span>
              <strong className="text-zinc-200">{act.metadata.member_name}</strong> joined the group
            </span>
          ),
          time: timeStr,
        };
      case 'member_removed':
        return {
          icon: <UserMinus className="w-4 h-4 text-rose-400" />,
          message: (
            <span>
              <strong className="text-zinc-200">{act.metadata.member_name}</strong> was removed from the group
            </span>
          ),
          time: timeStr,
        };
      default:
        return {
          icon: <Calendar className="w-4 h-4 text-zinc-400" />,
          message: <span>Activity recorded in group ledger</span>,
          time: timeStr,
        };
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6 text-zinc-500 text-xs gap-2">
        <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
        <span>Loading activities...</span>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="glass rounded-2xl p-6 text-center border border-white/5">
        <p className="text-xs text-zinc-500">No activity recorded in this group ledger yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1 no-scrollbar">
      <AnimatePresence initial={false}>
        {activities.map((act) => {
          const details = getActionDetails(act);
          return (
            <motion.div
              key={act.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="glass p-3 rounded-xl border border-white/5 flex items-start gap-3 hover:bg-white/[0.02] transition-colors"
            >
              <div className="p-1.5 bg-white/5 rounded-lg border border-white/10 flex-shrink-0 mt-0.5">
                {details.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-zinc-400 leading-normal">{details.message}</p>
                <span className="text-[10px] text-zinc-500 font-medium mt-1 block">
                  {details.time}
                </span>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
