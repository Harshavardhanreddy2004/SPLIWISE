import React from 'react';
import { Utensils, Zap, Car, Ticket, ShoppingBag, Coffee, FileText, HelpCircle } from 'lucide-react';
import type { Expense } from '../../types';
import { formatCurrency } from '../../utils/expense';
import { useAuth } from '../../context/AuthContext';

interface RecentExpensesProps {
  expenses: (Expense & { groupName: string })[];
  onNavigate: (view: string) => void;
}

export const RecentExpenses: React.FC<RecentExpensesProps> = ({
  expenses,
  onNavigate,
}) => {
  const { profile } = useAuth();

  const getExpenseIcon = (title: string) => {
    const lower = title.toLowerCase();
    if (lower.includes('food') || lower.includes('dinner') || lower.includes('lunch') || lower.includes('sushi') || lower.includes('restaurant') || lower.includes('eat')) {
      return <Utensils className="w-4 h-4" />;
    }
    if (lower.includes('bill') || lower.includes('electr') || lower.includes('power') || lower.includes('water') || lower.includes('gas') || lower.includes('utility')) {
      return <Zap className="w-4 h-4" />;
    }
    if (lower.includes('cab') || lower.includes('taxi') || lower.includes('uber') || lower.includes('car') || lower.includes('flight') || lower.includes('bus') || lower.includes('travel') || lower.includes('fuel')) {
      return <Car className="w-4 h-4" />;
    }
    if (lower.includes('ticket') || lower.includes('movie') || lower.includes('show') || lower.includes('entry') || lower.includes('excursion') || lower.includes('fun')) {
      return <Ticket className="w-4 h-4" />;
    }
    if (lower.includes('grocery') || lower.includes('shop') || lower.includes('supermarket') || lower.includes('mart') || lower.includes('clothes')) {
      return <ShoppingBag className="w-4 h-4" />;
    }
    if (lower.includes('coffee') || lower.includes('cafe') || lower.includes('starbucks') || lower.includes('drink')) {
      return <Coffee className="w-4 h-4" />;
    }
    if (lower.includes('rent') || lower.includes('deposit') || lower.includes('lease') || lower.includes('contract')) {
      return <FileText className="w-4 h-4" />;
    }
    return <HelpCircle className="w-4 h-4" />;
  };

  const getUserShareDetails = (expense: Expense) => {
    if (!profile) return { text: '', color: 'text-zinc-400' };

    const isPayer = expense.paid_by === profile.id;
    const userSplit = expense.splits?.find((s) => s.profile_id === profile.id);

    if (isPayer) {
      // User paid. What did they lend?
      // Lent amount is the total amount minus user's own share.
      const totalSplits = expense.splits?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;
      const userShare = Number(userSplit?.amount || 0);
      
      // If splits exist, lent is totalSplits - userShare. Otherwise, estimate 0.
      const lentAmount = expense.splits && expense.splits.length > 0 ? (totalSplits - userShare) : 0;
      
      return {
        text: lentAmount > 0 ? `You lent ${formatCurrency(lentAmount)}` : 'You paid',
        color: 'text-emerald-500 dark:text-emerald-400',
      };
    } else {
      // Someone else paid. Does the user owe?
      if (userSplit) {
        return {
          text: `You owe ${formatCurrency(Number(userSplit.amount))}`,
          color: 'text-rose-500 dark:text-rose-400',
        };
      }
      return {
        text: 'Not involved',
        color: 'text-zinc-500',
      };
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold tracking-wide text-zinc-500 dark:text-zinc-400 uppercase">
          Recent Expenses
        </h3>
        <button
          onClick={() => onNavigate('groups-list')}
          className="text-xs text-indigo-400 hover:underline"
        >
          View All
        </button>
      </div>

      {expenses.length === 0 ? (
        <div className="glass rounded-2xl p-6 text-center border">
          <p className="text-sm text-zinc-500">No recent expenses logged.</p>
        </div>
      ) : (
        <div className="glass rounded-2xl divide-y divide-white/5 overflow-hidden shadow-md border">
          {expenses.map((expense) => {
            const share = getUserShareDetails(expense);
            const payerName = expense.paid_by === profile?.id ? 'You' : expense.profile?.name || 'Someone';

            return (
              <div
                key={expense.id}
                className="p-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white/5 dark:bg-zinc-800 border border-white/10 flex items-center justify-center text-zinc-600 dark:text-zinc-300">
                    {getExpenseIcon(expense.title)}
                  </div>
                  <div>
                    <h5 className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                      {expense.title}
                    </h5>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      Paid by {payerName} in{' '}
                      <span className="text-zinc-700 dark:text-zinc-300 font-medium">
                        {expense.groupName}
                      </span>
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-100 block">
                    {formatCurrency(Number(expense.amount))}
                  </span>
                  <span className={`text-[10px] font-medium block ${share.color}`}>
                    {share.text}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
