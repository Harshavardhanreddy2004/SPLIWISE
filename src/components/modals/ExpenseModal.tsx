import React, { useEffect, useState } from 'react';

import { useAuth } from '../../context/AuthContext';
import * as api from '../../services/api';
import { uploadReceipt } from '../../services/storage';
import type { Group, Profile, Expense } from '../../types';
import { X, Camera, RefreshCw, CheckSquare, Square, Percent, DollarSign } from 'lucide-react';

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupContextId?: string | null;
  groups: Group[];
  editingExpense: Expense | null;
  onSave: (
    expenseId: string | null,
    groupId: string,
    title: string,
    amount: number,
    paidBy: string,
    splits: { profileId: string; amount: number }[],
    receiptUrl: string | null,
    splitType: 'equal' | 'percentage' | 'exact',
    notes: string | null
  ) => Promise<void>;
  showToast: (msg: string, type: 'success' | 'error') => void;
}

export const ExpenseModal: React.FC<ExpenseModalProps> = ({
  isOpen,
  onClose,
  groupContextId,
  groups,
  editingExpense,
  onSave,
  showToast,
}) => {
  const { profile } = useAuth();

  // Basic Details States
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [paidBy, setPaidBy] = useState('');
  const [notes, setNotes] = useState('');
  const [splitType, setSplitType] = useState<'equal' | 'percentage' | 'exact'>('equal');

  // Members Dynamic Fetch State
  const [members, setMembers] = useState<Profile[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  // Split calculations states
  const [involvedMemberIds, setInvolvedMemberIds] = useState<string[]>([]);
  const [percentageShares, setPercentageShares] = useState<Record<string, string>>({});
  const [exactAmounts, setExactAmounts] = useState<Record<string, string>>({});

  // Receipt State
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [existingReceiptUrl, setExistingReceiptUrl] = useState<string | null>(null);

  // Setup/prepopulate form fields
  useEffect(() => {
    if (isOpen) {
      if (editingExpense) {
        setSelectedGroupId(editingExpense.group_id);
        setTitle(editingExpense.title);
        setAmount(editingExpense.amount.toString());
        setPaidBy(editingExpense.paid_by);
        setNotes(editingExpense.notes || '');
        setSplitType(editingExpense.split_type || 'equal');
        setExistingReceiptUrl(editingExpense.receipt_url || null);
        setReceiptFile(null);
      } else {
        setSelectedGroupId(groupContextId || (groups.length > 0 ? groups[0].id : ''));
        setTitle('');
        setAmount('');
        setPaidBy(profile?.id || '');
        setNotes('');
        setSplitType('equal');
        setExistingReceiptUrl(null);
        setReceiptFile(null);
      }
    }
  }, [isOpen, editingExpense, groupContextId, groups, profile]);

  // Dynamic fetch members list of selected group
  useEffect(() => {
    const loadMembers = async () => {
      if (!selectedGroupId) return;
      setLoadingMembers(true);
      try {
        const groupMembers = await api.fetchGroupMembers(selectedGroupId);
        setMembers(groupMembers);

        if (editingExpense && editingExpense.group_id === selectedGroupId) {
          // Pre-populate split configurations
          const savedSplits = editingExpense.splits || [];
          const savedIds = savedSplits.map((s) => s.profile_id);
          setInvolvedMemberIds(savedIds);

          const pctMap: Record<string, string> = {};
          const exMap: Record<string, string> = {};
          
          savedSplits.forEach((s) => {
            if (editingExpense.split_type === 'percentage') {
              const sharePercent = ((Number(s.amount) / Number(editingExpense.amount)) * 100).toFixed(1);
              pctMap[s.profile_id] = sharePercent;
            } else if (editingExpense.split_type === 'exact') {
              exMap[s.profile_id] = s.amount.toString();
            }
          });
          
          setPercentageShares(pctMap);
          setExactAmounts(exMap);
        } else {
          // Default splits
          setInvolvedMemberIds(groupMembers.map((m) => m.id));
          
          const defaultPct = (100 / groupMembers.length).toFixed(1);
          const defaultExact = '';
          const pctMap: Record<string, string> = {};
          const exMap: Record<string, string> = {};
          
          groupMembers.forEach((m) => {
            pctMap[m.id] = defaultPct;
            exMap[m.id] = defaultExact;
          });
          
          setPercentageShares(pctMap);
          setExactAmounts(exMap);
        }
      } catch (err) {
        console.error(err);
        showToast('Failed to load group members.', 'error');
      } finally {
        setLoadingMembers(false);
      }
    };

    if (isOpen && selectedGroupId) {
      loadMembers();
    }
  }, [selectedGroupId, isOpen, editingExpense]);

  if (!isOpen) return null;

  const handleToggleMember = (memberId: string) => {
    setInvolvedMemberIds((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId]
    );
  };

  const handlePctChange = (memberId: string, val: string) => {
    setPercentageShares((prev) => ({
      ...prev,
      [memberId]: val,
    }));
  };

  const handleExactChange = (memberId: string, val: string) => {
    setExactAmounts((prev) => ({
      ...prev,
      [memberId]: val,
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
      if (!allowed.includes(file.type)) {
        showToast('Please upload a valid receipt (PNG, JPG, WEBP, PDF).', 'error');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        showToast('File size must be under 5MB.', 'error');
        return;
      }
      setReceiptFile(file);
    }
  };

  // Helper validation aggregates
  const getSumPercent = () => {
    return involvedMemberIds.reduce((sum, id) => sum + parseFloat(percentageShares[id] || '0'), 0);
  };

  const getSumExact = () => {
    return involvedMemberIds.reduce((sum, id) => sum + parseFloat(exactAmounts[id] || '0'), 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || !selectedGroupId) return;

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      showToast('Please enter a valid expense amount.', 'error');
      return;
    }

    if (involvedMemberIds.length === 0) {
      showToast('Please select at least one member to split with.', 'error');
      return;
    }

    // Validation checks for split modes
    let splitsPayload: { profileId: string; amount: number }[] = [];

    if (splitType === 'equal') {
      const splitValue = parsedAmount / involvedMemberIds.length;
      let totalAssigned = 0;
      
      splitsPayload = involvedMemberIds.map((memberId, idx) => {
        const roundedAmount = idx === 0 
          ? Math.round((parsedAmount - (splitValue * (involvedMemberIds.length - 1))) * 100) / 100
          : Math.round(splitValue * 100) / 100;
        
        totalAssigned += roundedAmount;
        return {
          profileId: memberId,
          amount: roundedAmount,
        };
      });
    } else if (splitType === 'percentage') {
      const sumPct = getSumPercent();
      if (Math.abs(sumPct - 100) > 0.05) {
        showToast(`Percentage splits must sum to exactly 100%. Currently: ${sumPct.toFixed(1)}%`, 'error');
        return;
      }

      let totalAssigned = 0;
      splitsPayload = involvedMemberIds.map((memberId) => {
        const pct = parseFloat(percentageShares[memberId] || '0') / 100;
        const calculatedAmount = Math.round(parsedAmount * pct * 100) / 100;
        totalAssigned += calculatedAmount;
        return {
          profileId: memberId,
          amount: calculatedAmount,
        };
      });

      // Handle any floating rounding discrepancy by adding it to the first split
      const difference = Math.round((parsedAmount - totalAssigned) * 100) / 100;
      if (difference !== 0 && splitsPayload.length > 0) {
        splitsPayload[0].amount = Math.round((splitsPayload[0].amount + difference) * 100) / 100;
      }
    } else if (splitType === 'exact') {
      const sumExact = getSumExact();
      if (Math.abs(sumExact - parsedAmount) > 0.01) {
        showToast(
          `Exact amounts must sum to the total amount of $${parsedAmount.toFixed(
            2
          )}. Currently: $${sumExact.toFixed(2)}`,
          'error'
        );
        return;
      }

      splitsPayload = involvedMemberIds.map((memberId) => ({
        profileId: memberId,
        amount: Math.round(parseFloat(exactAmounts[memberId] || '0') * 100) / 100,
      }));
    }

    setSubmitting(true);
    try {
      let finalReceiptUrl = existingReceiptUrl;

      if (receiptFile) {
        showToast('Uploading receipt attachment...', 'success');
        finalReceiptUrl = await uploadReceipt(receiptFile, selectedGroupId);
      }

      await onSave(
        editingExpense?.id || null,
        selectedGroupId,
        title.trim(),
        parsedAmount,
        paidBy,
        splitsPayload,
        finalReceiptUrl,
        splitType,
        notes.trim() || null
      );

      onClose();
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Failed to save expense.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const sumPct = getSumPercent();
  const sumExact = getSumExact();
  const parsedAmountVal = parseFloat(amount) || 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-end justify-center md:items-center p-0 md:p-4 animate-fade-in">
      <div className="w-full max-w-md glass rounded-t-2xl md:rounded-2xl p-6 space-y-4 shadow-2xl border-x-0 bottom-0 md:border-x border-white/10 max-h-[90vh] overflow-y-auto no-scrollbar">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-2 border-b border-white/5">
          <h3 className="text-lg font-bold tracking-tight text-zinc-100">
            {editingExpense ? 'Edit Expense' : 'Add Expense'}
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 glass rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-200 hover:bg-white/5 active:scale-95 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          {/* Select Group Context */}
          <div>
            <label className="block text-xs font-semibold text-zinc-400 mb-1 ml-1">
              Select Group Context
            </label>
            {groupContextId && !editingExpense ? (
              <div className="w-full glass-input rounded-xl px-4 py-3 text-sm text-zinc-300 opacity-80 border bg-zinc-900/40">
                {groups.find((g) => g.id === selectedGroupId)?.name}
              </div>
            ) : (
              <select
                value={selectedGroupId}
                onChange={(e) => setSelectedGroupId(e.target.value)}
                className="w-full glass-input rounded-xl px-4 py-3 text-sm text-zinc-100 bg-zinc-950 border border-white/5"
                required
                disabled={editingExpense !== null || submitting}
              >
                <option value="" disabled>Choose a group</option>
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Expense Title */}
          <div>
            <label className="block text-xs font-semibold text-zinc-400 mb-1 ml-1">
              Expense Title
            </label>
            <input
              type="text"
              placeholder="What did you pay for?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full glass-input rounded-xl px-4 py-3 text-sm"
              required
              disabled={submitting}
            />
          </div>

          {/* Amount input */}
          <div>
            <label className="block text-xs font-semibold text-zinc-400 mb-1 ml-1">
              Amount ($)
            </label>
            <div className="relative">
              <span className="absolute left-4 top-3.5 font-bold text-zinc-400 text-sm">$</span>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full glass-input rounded-xl pl-8 pr-4 py-3 text-sm font-mono text-zinc-100"
                required
                disabled={submitting}
              />
            </div>
          </div>

          {/* split options tabs */}
          {members.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1.5 ml-1">
                Split Scheme
              </label>
              <div className="glass rounded-xl p-1 flex text-xs font-semibold border border-white/5">
                <button
                  type="button"
                  onClick={() => setSplitType('equal')}
                  className={`flex-1 py-1.5 text-center rounded-lg transition-all ${
                    splitType === 'equal' ? 'bg-white/10 text-white shadow' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Equally
                </button>
                <button
                  type="button"
                  onClick={() => setSplitType('percentage')}
                  className={`flex-1 py-1.5 text-center rounded-lg transition-all ${
                    splitType === 'percentage' ? 'bg-white/10 text-white shadow' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Percentage
                </button>
                <button
                  type="button"
                  onClick={() => setSplitType('exact')}
                  className={`flex-1 py-1.5 text-center rounded-lg transition-all ${
                    splitType === 'exact' ? 'bg-white/10 text-white shadow' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Exact
                </button>
              </div>
            </div>
          )}

          {/* Payer and splits loading indicator */}
          {loadingMembers ? (
            <div className="flex items-center justify-center py-4">
              <RefreshCw className="w-5 h-5 text-indigo-400 animate-spin mr-2" />
              <span className="text-xs text-zinc-500">Retrieving member list...</span>
            </div>
          ) : (
            members.length > 0 && (
              <div className="space-y-4">
                {/* Paid By dropdown */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1 ml-1">
                    Paid By
                  </label>
                  <select
                    value={paidBy}
                    onChange={(e) => setPaidBy(e.target.value)}
                    className="w-full glass-input rounded-xl px-4 py-3 text-sm text-zinc-100 bg-zinc-950 border border-white/5"
                    required
                    disabled={submitting}
                  >
                    {members.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.id === profile?.id ? 'You' : member.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Checked splits Checklist / input options */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center px-1">
                    <label className="block text-xs font-semibold text-zinc-400">
                      Split Configuration
                    </label>
                    {splitType === 'percentage' && (
                      <span className={`text-[10px] font-semibold flex items-center gap-1 ${
                        Math.abs(sumPct - 100) < 0.05 ? 'text-emerald-400' : 'text-amber-400'
                      }`}>
                        <Percent className="w-3 h-3" /> {sumPct.toFixed(1)}% / 100%
                      </span>
                    )}
                    {splitType === 'exact' && (
                      <span className={`text-[10px] font-semibold flex items-center gap-1 ${
                        Math.abs(sumExact - parsedAmountVal) < 0.01 ? 'text-emerald-400' : 'text-amber-400'
                      }`}>
                        <DollarSign className="w-3 h-3" /> ${sumExact.toFixed(2)} / ${parsedAmountVal.toFixed(2)}
                      </span>
                    )}
                  </div>

                  <div className="glass rounded-xl p-3 max-h-48 overflow-y-auto no-scrollbar border border-white/5 space-y-2.5">
                    {members.map((member) => {
                      const isChecked = involvedMemberIds.includes(member.id);
                      
                      return (
                        <div
                          key={member.id}
                          className="flex items-center justify-between text-xs text-zinc-200"
                        >
                          <div
                            onClick={() => handleToggleMember(member.id)}
                            className="flex items-center gap-2.5 cursor-pointer select-none"
                          >
                            {isChecked ? (
                              <CheckSquare className="w-4 h-4 text-indigo-400" />
                            ) : (
                              <Square className="w-4 h-4 text-zinc-500" />
                            )}
                            <span className={isChecked ? 'text-zinc-100 font-medium' : 'text-zinc-400'}>
                              {member.name} {member.id === profile?.id && '(You)'}
                            </span>
                          </div>

                          {/* Render input elements per participant if not equal split */}
                          {isChecked && splitType === 'percentage' && (
                            <div className="relative w-20">
                              <input
                                type="number"
                                placeholder="0"
                                step="0.1"
                                min="0"
                                max="100"
                                value={percentageShares[member.id] || ''}
                                onChange={(e) => handlePctChange(member.id, e.target.value)}
                                className="w-full glass-input rounded-lg px-2 py-1 text-right text-xs pr-6"
                                required
                              />
                              <span className="absolute right-2 top-1.5 text-[10px] text-zinc-500">%</span>
                            </div>
                          )}

                          {isChecked && splitType === 'exact' && (
                            <div className="relative w-24">
                              <span className="absolute left-2 top-1.5 text-[10px] text-zinc-500">$</span>
                              <input
                                type="number"
                                placeholder="0.00"
                                step="0.01"
                                min="0"
                                value={exactAmounts[member.id] || ''}
                                onChange={(e) => handleExactChange(member.id, e.target.value)}
                                className="w-full glass-input rounded-lg pl-5 pr-2 py-1 text-right text-xs"
                                required
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )
          )}

          {/* Notes field */}
          <div>
            <label className="block text-xs font-semibold text-zinc-400 mb-1 ml-1">
              Notes (Optional)
            </label>
            <textarea
              placeholder="Add details, description, or memo..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full glass-input rounded-xl px-4 py-2 text-sm resize-none"
              disabled={submitting}
            />
          </div>

          {/* Receipt Attachment Upload */}
          <div>
            <label className="block text-xs font-semibold text-zinc-400 mb-1 ml-1">
              Upload Receipt Image/PDF (Optional)
            </label>
            <div className="border border-dashed border-white/10 rounded-xl p-4 text-center hover:bg-white/[0.02] transition cursor-pointer relative">
              <input
                type="file"
                onChange={handleFileChange}
                accept="image/*,application/pdf"
                className="absolute inset-0 opacity-0 cursor-pointer"
                disabled={submitting}
              />
              <Camera className="w-5 h-5 text-zinc-400 mx-auto mb-1" />
              <span className="text-xs text-zinc-400 block font-medium">
                {receiptFile ? receiptFile.name : 'Tap to upload picture or PDF receipt'}
              </span>
              {existingReceiptUrl && !receiptFile && (
                <span className="text-[9px] text-indigo-400 block mt-1">
                  Existing receipt linked. Tap to replace.
                </span>
              )}
            </div>
          </div>

          {/* Action Footer */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 glass text-xs py-3 rounded-xl font-bold text-zinc-300 hover:bg-white/5 active:scale-95 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !selectedGroupId}
              className="flex-1 bg-white text-zinc-950 text-xs py-3 rounded-xl font-bold shadow-lg hover:bg-zinc-200 active:scale-95 transition-all duration-200"
            >
              {submitting ? 'Saving...' : 'Save Log'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
export default ExpenseModal;
