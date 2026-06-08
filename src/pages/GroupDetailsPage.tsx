import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

import {
  useGroupDetails,
  useGroupMutations,
  useMemberMutations,
  useExpenseMutations,
  useSettlementMutations,
} from '../hooks/useQueries';
import * as api from '../services/api';
import { formatCurrency } from '../utils/expense';
import { ActivityFeed } from '../components/dashboard/ActivityFeed';
import {
  ChevronLeft,
  Plus,
  Sparkles,
  Utensils,
  Zap,
  Car,
  Ticket,
  ShoppingBag,
  Coffee,
  FileText,
  HelpCircle,
  Download,
  Trash2,
  Edit2,
  UserMinus,
  RefreshCw,
  Hash,
  Settings,
  X,
  History,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Profile, Debt, Settlement } from '../types';

interface GroupDetailsPageProps {
  groupId: string;
  onNavigate: (view: string) => void;
  onEditExpense: (expense: any) => void;
  onAddExpenseClick: () => void;
  showToast: (msg: string, type: 'success' | 'error') => void;
}

export const GroupDetailsPage: React.FC<GroupDetailsPageProps> = ({
  groupId,
  onNavigate,
  onEditExpense,
  onAddExpenseClick,
  showToast,
}) => {
  const { profile } = useAuth();


  // Load group details via React Query
  const {
    group,
    members,
    expenses,
    settlements,
    activities,
    netBalances,
    debts,
    loading,
    error,
    refetch,
  } = useGroupDetails(groupId);

  const { updateGroup, deleteGroup, isUpdating, isDeleting } = useGroupMutations(profile?.id);
  const { inviteMember, removeMember, isInviting } = useMemberMutations(groupId);
  const { deleteExpense } = useExpenseMutations(groupId);
  const { createSettlement, isSettling } = useSettlementMutations(groupId);

  // States
  const [activeTab, setActiveTab] = useState<'expenses' | 'settlements' | 'activities' | 'members'>('expenses');
  const [inviteId, setInviteId] = useState('');
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [editGroupName, setEditGroupName] = useState('');
  const [editGroupType, setEditGroupType] = useState<'trip' | 'home' | 'couple' | 'other'>('other');
  const [settlingDebtIndex, setSettlingDebtIndex] = useState<number | null>(null);
  const [customSettleAmount, setCustomSettleAmount] = useState<string>('');

  useEffect(() => {
    if (group) {
      setEditGroupName(group.name);
      setEditGroupType(group.type);
    }
  }, [group]);

  // Autocomplete search when typing SplitID
  useEffect(() => {
    const delayDebounce = setTimeout(async () => {
      const term = inviteId.trim();
      if (term.length >= 3) {
        try {
          const results = await api.searchProfilesByExpenseId(term);
          // Filter out users already in the group
          const filtered = results.filter((r) => !members.some((m) => m.id === r.id));
          setSearchResults(filtered);
        } catch (err) {
          console.error(err);
        }
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [inviteId, members]);

  const handleInvite = async (expenseIdToInvite: string) => {
    if (isInviting) return;
    try {
      await inviteMember(expenseIdToInvite);
      showToast('Member added to group successfully!', 'success');
      setInviteId('');
      setSearchResults([]);
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Failed to add member.', 'error');
    }
  };

  const handleRemoveMember = async (memberId: string, name: string) => {
    const memberBalance = netBalances[memberId] || 0;
    if (Math.abs(memberBalance) > 0.05) {
      showToast(`Cannot remove ${name}. They must be fully settled first (Balance: ${formatCurrency(memberBalance)}).`, 'error');
      return;
    }

    if (window.confirm(`Are you sure you want to remove ${name} from this group?`)) {
      try {
        await removeMember(memberId);
        showToast(`${name} removed from group.`, 'success');
      } catch (err: any) {
        console.error(err);
        showToast(err.message || 'Failed to remove member.', 'error');
      }
    }
  };

  const handleDeleteExpense = async (expenseId: string, title: string) => {
    if (window.confirm(`Delete expense "${title}"? This will recalculate all group balances.`)) {
      try {
        await deleteExpense(expenseId);
        showToast('Expense deleted successfully.', 'success');
      } catch (err: any) {
        console.error(err);
        showToast(err.message || 'Failed to delete expense.', 'error');
      }
    }
  };

  const handleSettleDebt = (index: number, initialAmount: number) => {
    setSettlingDebtIndex(index);
    setCustomSettleAmount(initialAmount.toFixed(2));
  };

  const handleConfirmSettle = async (debt: Debt) => {
    if (!profile) return;

    const parsedAmount = parseFloat(customSettleAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      showToast('Please enter a valid positive settlement amount.', 'error');
      return;
    }

    if (parsedAmount > debt.amount + 0.01) {
      showToast(`Settlement amount cannot exceed the outstanding debt of ${formatCurrency(debt.amount)}.`, 'error');
      return;
    }

    const desc = `Settle Up: ${debt.fromName} to ${debt.toName}`;

    try {
      // 1. Record the settlement in the Settlements table
      await createSettlement({
        payerId: debt.fromProfileId,
        payeeId: debt.toProfileId,
        amount: parsedAmount,
        createdBy: profile.id,
      });

      // 2. Record it in the Expenses table with 100% split to adjust balances
      await api.createExpense(
        groupId,
        desc,
        parsedAmount,
        debt.fromProfileId, // Paid by debtor
        [{ profileId: debt.toProfileId, amount: parsedAmount }], // Split share 100% to creditor
        null, // No receipt url for settlement
        profile.id, // Created by current user
        'exact'
      );

      showToast(`Logged cash settlement of ${formatCurrency(parsedAmount)}!`, 'success');
      setSettlingDebtIndex(null);
      refetch();
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Failed to record settlement.', 'error');
    }
  };

  const handleUpdateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!group || isUpdating) return;

    try {
      await updateGroup({
        groupId: group.id,
        updates: { name: editGroupName.trim(), type: editGroupType },
      });
      showToast('Group settings updated!', 'success');
      setShowSettingsModal(false);
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Failed to update group.', 'error');
    }
  };

  const handleDeleteGroup = async () => {
    if (!group) return;
    if (
      window.confirm(
        `DANGER: Are you sure you want to delete "${group.name}"? This action is permanent and deletes all expenses, splits, and settlements.`
      )
    ) {
      try {
        await deleteGroup(group.id);
        showToast('Group deleted successfully.', 'success');
        setShowSettingsModal(false);
        onNavigate('dashboard');
      } catch (err: any) {
        console.error(err);
        showToast(err.message || 'Failed to delete group.', 'error');
      }
    }
  };

  const getExpenseIcon = (title: string) => {
    const lower = title.toLowerCase();
    if (
      lower.includes('food') ||
      lower.includes('dinner') ||
      lower.includes('lunch') ||
      lower.includes('sushi') ||
      lower.includes('restaurant')
    ) {
      return <Utensils className="w-4 h-4 text-indigo-400" />;
    }
    if (
      lower.includes('bill') ||
      lower.includes('electricity') ||
      lower.includes('water') ||
      lower.includes('power')
    ) {
      return <Zap className="w-4 h-4 text-amber-400" />;
    }
    if (
      lower.includes('cab') ||
      lower.includes('taxi') ||
      lower.includes('uber') ||
      lower.includes('car') ||
      lower.includes('flight')
    ) {
      return <Car className="w-4 h-4 text-sky-400" />;
    }
    if (
      lower.includes('ticket') ||
      lower.includes('movie') ||
      lower.includes('entry') ||
      lower.includes('excursion')
    ) {
      return <Ticket className="w-4 h-4 text-purple-400" />;
    }
    if (
      lower.includes('grocery') ||
      lower.includes('shop') ||
      lower.includes('supermarket')
    ) {
      return <ShoppingBag className="w-4 h-4 text-emerald-400" />;
    }
    if (lower.includes('coffee') || lower.includes('cafe')) {
      return <Coffee className="w-4 h-4 text-zinc-400" />;
    }
    if (lower.includes('rent') || lower.includes('deposit')) {
      return <FileText className="w-4 h-4 text-yellow-500" />;
    }
    return <HelpCircle className="w-4 h-4 text-zinc-400" />;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 animate-fade-in max-w-md mx-auto">
        <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin mb-4" />
        <span className="text-xs text-zinc-500">Syncing group records...</span>
      </div>
    );
  }

  if (error || !group) {
    return (
      <div className="text-center py-20 space-y-4 max-w-md mx-auto">
        <p className="text-sm text-zinc-500">{error ? (error as any).message : 'Group not found.'}</p>
        <button
          onClick={() => onNavigate('dashboard')}
          className="px-4 py-2 bg-white text-zinc-950 font-bold rounded-xl text-xs"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  const userBalance = netBalances[profile?.id || ''] || 0;
  const isCreator = group.created_by === profile?.id;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, filter: 'blur(4px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      exit={{ opacity: 0, y: -12, filter: 'blur(4px)' }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-6 pb-10 max-w-3xl mx-auto"
    >
      {/* Group Header Banner */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => onNavigate('dashboard')}
            className="w-9 h-9 glass rounded-xl flex items-center justify-center text-zinc-400 hover:text-white transition active:scale-95 border border-white/5"
          >
            <ChevronLeft className="w-5 h-5 text-zinc-200" />
          </button>
          <div className="min-w-0">
            <h2 className="text-lg font-bold tracking-tight text-zinc-100 truncate max-w-[170px]">
              {group.name}
            </h2>
            {userBalance > 0.01 ? (
              <p className="text-xs text-emerald-450 dark:text-emerald-400 font-semibold truncate">
                You are owed {formatCurrency(userBalance)} here
              </p>
            ) : userBalance < -0.01 ? (
              <p className="text-xs text-rose-455 dark:text-rose-400 font-semibold truncate">
                You owe {formatCurrency(Math.abs(userBalance))} here
              </p>
            ) : (
              <p className="text-xs text-zinc-500 font-semibold truncate">
                You are fully settled up
              </p>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          {/* Copy Group ID button */}
          <button
            onClick={() => {
              navigator.clipboard.writeText(group.id);
              showToast('Group ID Copied!', 'success');
            }}
            className="h-9 px-3 glass rounded-xl flex items-center justify-center gap-1.5 text-xs text-zinc-450 hover:text-indigo-400 font-semibold active:scale-95 transition border border-white/5 shadow-sm"
            title="Copy Group ID"
          >
            <Hash className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Copy ID</span>
          </button>

          {/* Group Settings / Edit button */}
          <button
            onClick={() => setShowSettingsModal(true)}
            className="w-9 h-9 glass rounded-xl flex items-center justify-center text-zinc-400 hover:text-white transition active:scale-95 border border-white/5 shadow"
            title="Group Settings"
          >
            <Settings className="w-4.5 h-4.5" />
          </button>
        </div>
      </div>

      {/* Tabs Switcher Segment */}
      <div className="glass rounded-xl p-1 flex mb-5 text-xs font-semibold border border-white/5 shadow-md">
        {(['expenses', 'settlements', 'activities', 'members'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 text-center rounded-lg transition-all capitalize ${
              activeTab === tab
                ? 'bg-white/10 text-white shadow'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            {tab === 'activities' ? 'feed' : tab}
          </button>
        ))}
      </div>

      {/* TABS CONTAINER */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.15 }}
        >
          {/* 1. EXPENSES TAB */}
          {activeTab === 'expenses' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-xs font-bold text-zinc-500 tracking-wider uppercase">
                  Expense Log
                </span>
                <button
                  onClick={onAddExpenseClick}
                  className="text-xs text-indigo-400 flex items-center gap-1 font-semibold hover:underline"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Item
                </button>
              </div>

              {expenses.length === 0 ? (
                <div className="glass rounded-2xl p-8 text-center border border-white/5">
                  <p className="text-sm text-zinc-500">No expenses recorded yet.</p>
                  <button
                    onClick={onAddExpenseClick}
                    className="mt-3 px-4 py-2 bg-white text-zinc-950 rounded-xl text-xs font-bold hover:bg-zinc-200 transition"
                  >
                    Log First Expense
                  </button>
                </div>
              ) : (
                <div className="glass rounded-2xl divide-y divide-white/5 overflow-hidden shadow-md border border-white/5">
                  {expenses.map((expense) => {
                    const isPayer = expense.paid_by === profile?.id;
                    const userSplit = expense.splits?.find((s) => s.profile_id === profile?.id);
                    const isSettlement = expense.title.startsWith('Settle Up:');

                    let subText = `Paid by ${expense.profile?.name || 'Someone'}`;
                    if (isSettlement) {
                      subText = 'Settlement Log';
                    } else if (expense.splits && expense.splits.length > 0) {
                      subText = `Paid by ${isPayer ? 'You' : expense.profile?.name} • Split among ${
                        expense.splits.length
                      }`;
                    }

                    // user lent/owe details
                    let labelText = '';
                    let labelColor = 'text-zinc-500';
                    if (!isSettlement) {
                      if (isPayer) {
                        const totalSplits = expense.splits?.reduce((a, b) => a + Number(b.amount), 0) || 0;
                        const userShare = Number(userSplit?.amount || 0);
                        const userLent = totalSplits - userShare;
                        if (userLent > 0) {
                          labelText = `You lent ${formatCurrency(userLent)}`;
                          labelColor = 'text-emerald-400';
                        } else {
                          labelText = 'You paid';
                          labelColor = 'text-emerald-400';
                        }
                      } else if (userSplit) {
                        labelText = `You owe ${formatCurrency(Number(userSplit.amount))}`;
                        labelColor = 'text-rose-400';
                      }
                    }

                    return (
                      <div
                        key={expense.id}
                        className="p-4 flex items-center justify-between hover:bg-white/[0.02] transition group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
                            {getExpenseIcon(expense.title)}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-sm font-semibold text-zinc-200 truncate">
                              {expense.title}
                            </h4>
                            <p className="text-xs text-zinc-500 mt-0.5 truncate">
                              {subText}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 flex-shrink-0">
                          <div className="text-right">
                            <span className="text-sm font-mono font-bold text-zinc-200">
                              {formatCurrency(Number(expense.amount))}
                            </span>
                            {labelText && (
                              <span className={`text-[10px] block font-semibold ${labelColor}`}>
                                {labelText}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1">
                            {expense.receipt_url && (
                              <a
                                href={expense.receipt_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 text-zinc-500 hover:text-indigo-400 hover:bg-white/5 rounded-lg transition"
                                title="Download Receipt"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </a>
                            )}

                            {(expense.created_by === profile?.id || isCreator) && (
                              <>
                                {!isSettlement && (
                                  <button
                                    onClick={() => onEditExpense(expense)}
                                    className="p-1.5 text-zinc-500 hover:text-indigo-450 hover:text-white hover:bg-white/5 rounded-lg transition"
                                    title="Edit Expense"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                <button
                                  onClick={() => handleDeleteExpense(expense.id, expense.title)}
                                  className="p-1.5 text-zinc-500 hover:text-rose-500 hover:bg-white/5 rounded-lg transition"
                                  title="Delete Expense"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* 2. SETTLEMENTS TAB */}
          {activeTab === 'settlements' && (
            <div className="space-y-5">
              {/* Suggested Settlements Section */}
              <div className="glass rounded-2xl p-4 bg-emerald-500/5 border border-emerald-500/10 shadow-inner">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400 mt-0.5">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-emerald-450 dark:text-emerald-400 uppercase tracking-widest">
                      Suggested Settlements
                    </h4>
                    <p className="text-[10px] text-zinc-550 mb-3 font-semibold">
                      Simplified net debts to settle balances
                    </p>

                    {debts.length === 0 ? (
                      <p className="text-xs text-zinc-400 font-medium">Everyone is settled! No debts found.</p>
                    ) : (
                      <div className="space-y-3">
                        {debts.map((debt, index) => {
                          const isSelfInvolved =
                            profile?.id === debt.fromProfileId ||
                            profile?.id === debt.toProfileId;

                          return (
                            <div
                              key={index}
                              className="flex items-center justify-between border-b border-white/5 pb-2.5 last:border-0 last:pb-0"
                            >
                              <div className="text-xs text-zinc-350 min-w-0 pr-2">
                                <span className="font-bold text-zinc-200">{debt.fromName}</span> owes{' '}
                                <span className="font-bold text-indigo-400">{debt.toName}</span>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                {settlingDebtIndex === index ? (
                                  <div className="flex items-center gap-1.5">
                                    <div className="relative w-20">
                                      <span className="absolute left-1.5 top-1.5 text-[9px] text-zinc-550">₹</span>
                                      <input
                                        type="number"
                                        step="0.01"
                                        value={customSettleAmount}
                                        onChange={(e) => setCustomSettleAmount(e.target.value)}
                                        className="w-full glass-input rounded px-1.5 py-0.5 text-right text-[10px] text-zinc-100 pl-4 bg-zinc-950 border border-white/5"
                                        placeholder="0.00"
                                        disabled={isSettling}
                                      />
                                    </div>
                                    <button
                                      onClick={() => handleConfirmSettle(debt)}
                                      disabled={isSettling}
                                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[9px] px-2 py-1.5 rounded transition active:scale-95 shadow-sm"
                                    >
                                      ✓
                                    </button>
                                    <button
                                      onClick={() => setSettlingDebtIndex(null)}
                                      disabled={isSettling}
                                      className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-[9px] px-2 py-1.5 rounded transition active:scale-95"
                                    >
                                      ✗
                                    </button>
                                  </div>
                                ) : (
                                  <>
                                    <span className="font-mono font-bold text-emerald-400 text-xs">
                                      {formatCurrency(debt.amount)}
                                    </span>

                                    {(isSelfInvolved || isCreator) && (
                                      <button
                                        onClick={() => handleSettleDebt(index, debt.amount)}
                                        disabled={isSettling}
                                        className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[10px] px-3 py-1 rounded-lg transition active:scale-95 shadow-sm"
                                      >
                                        {isSettling ? '...' : 'Settle'}
                                      </button>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Settlement History Logs Section */}
              <div className="space-y-3">
                <div className="flex items-center gap-1.5 px-1">
                  <History className="w-3.5 h-3.5 text-zinc-550" />
                  <span className="text-xs font-bold text-zinc-550 uppercase tracking-widest">
                    Settlement History
                  </span>
                </div>

                {settlements.length === 0 ? (
                  <div className="glass rounded-xl p-6 text-center border border-white/5">
                    <p className="text-xs text-zinc-550 font-medium">No settlements logged yet.</p>
                  </div>
                ) : (
                  <div className="glass rounded-2xl divide-y divide-white/5 border border-white/5 overflow-hidden">
                    {settlements.map((setl: Settlement) => (
                      <div key={setl.id} className="p-3.5 flex items-center justify-between text-xs hover:bg-white/[0.01] transition-colors">
                        <div className="flex items-center gap-3">
                          <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                          <div>
                            <span className="text-zinc-200 font-medium">
                              {setl.payer?.name} settled up to {setl.payee?.name}
                            </span>
                            <span className="text-[10px] text-zinc-500 block mt-0.5">
                              {new Date(setl.created_at).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </span>
                          </div>
                        </div>
                        <span className="font-mono font-bold text-emerald-450 dark:text-emerald-450">
                          {formatCurrency(Number(setl.amount))}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 3. ACTIVITIES TAB */}
          {activeTab === 'activities' && (
            <div className="space-y-3">
              <span className="text-xs font-bold text-zinc-500 tracking-wider uppercase px-1 block mb-1">
                Recent Group logs
              </span>
              <ActivityFeed activities={activities} />
            </div>
          )}

          {/* 4. MEMBERS TAB */}
          {activeTab === 'members' && (
            <div className="space-y-4">
              {/* Invite Member Panel */}
              <div className="glass rounded-2xl p-4 border border-white/5 shadow">
                <span className="text-xs font-semibold text-zinc-400 block mb-2">
                  Invite Member by SplitID
                </span>
                <div className="relative">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Search SPL-XXXXXX code"
                      value={inviteId}
                      onChange={(e) => setInviteId(e.target.value)}
                      className="flex-1 glass-input rounded-xl px-4 py-2.5 text-xs placeholder-zinc-600"
                      disabled={isInviting}
                    />
                  </div>

                  {/* Autocomplete Results Panel */}
                  {searchResults.length > 0 && (
                    <div className="absolute left-0 right-0 mt-1.5 glass bg-zinc-950 border border-white/10 rounded-xl overflow-hidden shadow-2xl z-30 divide-y divide-white/5 animate-fade-in">
                      {searchResults.map((user) => (
                        <div
                          key={user.id}
                          onClick={() => handleInvite(user.expense_id)}
                          className="p-3 flex items-center justify-between hover:bg-white/5 cursor-pointer text-xs transition"
                        >
                          <div>
                            <span className="text-zinc-200 font-bold block">{user.name}</span>
                            <span className="text-[10px] text-zinc-550 block font-mono mt-0.5">{user.expense_id}</span>
                          </div>
                          <span className="text-[10px] bg-indigo-600/10 text-indigo-400 px-2 py-0.5 rounded border border-indigo-500/10 font-bold uppercase">
                            Invite
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Members List */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-zinc-500 tracking-wider uppercase px-1 block">
                  Group Members ({members.length})
                </span>
                <div className="glass rounded-2xl divide-y divide-white/5 border border-white/5 overflow-hidden shadow">
                  {members.map((member) => {
                    const memberBalance = netBalances[member.id] || 0;
                    const isMemberCreator = group.created_by === member.id;
                    const isSelf = member.id === profile?.id;

                    return (
                      <div
                        key={member.id}
                        className="p-3.5 flex items-center justify-between hover:bg-white/[0.01] transition"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center text-xs font-bold text-zinc-200">
                            {member.name[0].toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-zinc-200">
                                {member.name} {isSelf && '(You)'}
                              </span>
                              {isMemberCreator && (
                                <span className="text-[9px] bg-indigo-500/15 border border-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                                  Creator
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-zinc-550 block font-mono mt-0.5">
                              {member.expense_id}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            {memberBalance > 0.01 ? (
                              <span className="text-xs text-emerald-400 font-bold block">
                                Owed {formatCurrency(memberBalance)}
                              </span>
                            ) : memberBalance < -0.01 ? (
                              <span className="text-xs text-rose-400 font-bold block">
                                Owes {formatCurrency(Math.abs(memberBalance))}
                              </span>
                            ) : (
                              <span className="text-xs text-zinc-550 block font-semibold">Settled</span>
                            )}
                          </div>

                          {isCreator && !isSelf && (
                            <button
                              onClick={() => handleRemoveMember(member.id, member.name)}
                              className="p-1.5 text-zinc-500 hover:text-rose-500 hover:bg-white/5 rounded-lg transition"
                              title="Remove Member"
                            >
                              <UserMinus className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* 5. EDIT GROUP SETTINGS MODAL */}
      <AnimatePresence>
        {showSettingsModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-end justify-center md:items-center p-0 md:p-4 animate-fade-in">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="w-full max-w-md glass rounded-t-2xl md:rounded-2xl p-6 space-y-5 shadow-2xl border-x-0 bottom-0 md:border-x border-white/10"
            >
              <div className="flex items-center justify-between pb-2 border-b border-white/5">
                <h3 className="text-lg font-bold text-zinc-100">Group Settings</h3>
                <button
                  onClick={() => setShowSettingsModal(false)}
                  className="w-8 h-8 glass rounded-full flex items-center justify-center text-zinc-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleUpdateGroup} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">
                    Group Name
                  </label>
                  <input
                    type="text"
                    value={editGroupName}
                    onChange={(e) => setEditGroupName(e.target.value)}
                    className="w-full glass-input rounded-xl px-4 py-3 text-sm text-white"
                    required
                    disabled={isUpdating}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">
                    Category Type
                  </label>
                  <select
                    value={editGroupType}
                    onChange={(e: any) => setEditGroupType(e.target.value)}
                    className="w-full glass-input rounded-xl px-4 py-3 text-sm text-white bg-zinc-950 border border-white/5"
                    disabled={isUpdating}
                  >
                    <option value="trip">Trip</option>
                    <option value="home">Home</option>
                    <option value="couple">Couple</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowSettingsModal(false)}
                    className="flex-1 glass text-xs py-3 rounded-xl font-bold text-zinc-300"
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdating}
                    className="flex-1 bg-white text-zinc-950 text-xs py-3 rounded-xl font-bold hover:bg-zinc-200"
                  >
                    {isUpdating ? 'Saving...' : 'Save Settings'}
                  </button>
                </div>
              </form>

              {/* Danger Zone */}
              {isCreator && (
                <div className="pt-4 border-t border-white/5 space-y-2.5">
                  <div className="flex items-center gap-1.5 text-rose-400 text-xs font-semibold uppercase tracking-widest">
                    <AlertTriangle className="w-4 h-4 text-rose-500" />
                    <span>Danger Zone</span>
                  </div>
                  <button
                    onClick={handleDeleteGroup}
                    disabled={isDeleting}
                    className="w-full py-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-450 dark:text-rose-400 border border-rose-500/20 text-xs font-bold rounded-xl transition active:scale-95"
                  >
                    {isDeleting ? 'Deleting Group...' : 'Delete Group Permanently'}
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
export default GroupDetailsPage;
