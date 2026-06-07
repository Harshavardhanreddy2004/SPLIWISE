import React from 'react';
import { ArrowDownLeft, ArrowUpRight, TrendingUp, TrendingDown } from 'lucide-react';
import { formatCurrency } from '../../utils/expense';

interface BalanceCardProps {
  totalOwed: number; // positive balance (lent money)
  totalOwe: number;  // negative balance (borrowed money)
  owedCount: number; // number of groups/people where user is owed
  oweCount: number;  // number of groups/people where user owes
}

export const BalanceCard: React.FC<BalanceCardProps> = ({
  totalOwed,
  totalOwe,
  owedCount,
  oweCount,
}) => {
  return (
    <div className="grid grid-cols-2 gap-4 mb-6">
      {/* Owed Card (Lent) */}
      <div className="glass rounded-2xl p-4 relative overflow-hidden shadow-lg border border-emerald-500/10 hover:border-emerald-500/20 hover:bg-white/[0.05] transition-all duration-300 group">
        <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 group-hover:opacity-15 transition-all">
          <ArrowDownLeft className="w-12 h-12 text-emerald-400" />
        </div>
        <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 block mb-1">
          You are owed
        </span>
        <span className="text-2xl font-bold tracking-tight text-emerald-500 dark:text-emerald-400">
          {formatCurrency(totalOwed)}
        </span>
        <div className="flex items-center gap-1 text-[10px] text-emerald-500/80 mt-2 font-medium">
          <TrendingUp className="w-3.5 h-3.5" />
          <span>In {owedCount} group{owedCount !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Owe Card (Borrowed) */}
      <div className="glass rounded-2xl p-4 relative overflow-hidden shadow-lg border border-rose-500/10 hover:border-rose-500/20 hover:bg-white/[0.05] transition-all duration-300 group">
        <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 group-hover:opacity-15 transition-all">
          <ArrowUpRight className="w-12 h-12 text-rose-400" />
        </div>
        <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 block mb-1">
          You owe
        </span>
        <span className="text-2xl font-bold tracking-tight text-rose-500 dark:text-rose-400">
          {formatCurrency(totalOwe)}
        </span>
        <div className="flex items-center gap-1 text-[10px] text-rose-400/80 mt-2 font-medium">
          <TrendingDown className="w-3.5 h-3.5" />
          <span>In {oweCount} group{oweCount !== 1 ? 's' : ''}</span>
        </div>
      </div>
    </div>
  );
};
