import { useState, useEffect, useCallback } from 'react';
import type { Group, Profile, Expense, Debt } from '../types';
import * as api from '../services/api';
import { calculateBalances } from '../utils/expense';
import { supabase } from '../lib/supabaseClient';

export function useGroupData(groupId: string | undefined) {
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<Profile[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [netBalances, setNetBalances] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadGroupData = useCallback(async () => {
    if (!groupId) return;
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch group metadata
      const { data: groupData, error: groupErr } = await supabase
        .from('groups')
        .select('*')
        .eq('id', groupId)
        .single();

      if (groupErr) throw groupErr;
      setGroup(groupData);

      // 2. Fetch group members profiles
      const membersData = await api.fetchGroupMembers(groupId);
      setMembers(membersData);

      // 3. Fetch group expenses log with splits
      const expensesData = await api.fetchGroupExpenses(groupId);
      setExpenses(expensesData);

      // 4. Calculate suggested settlements
      const { netBalances: calculatedBalances, debts: calculatedDebts } = calculateBalances(
        membersData,
        expensesData
      );
      setNetBalances(calculatedBalances);
      setDebts(calculatedDebts);
    } catch (err: any) {
      console.error('Error fetching group data:', err);
      setError(err.message || 'Failed to load group details.');
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    if (groupId) {
      loadGroupData();
    } else {
      setGroup(null);
      setMembers([]);
      setExpenses([]);
      setDebts([]);
      setNetBalances({});
      setLoading(false);
    }
  }, [groupId, loadGroupData]);

  const addExpense = async (
    title: string,
    amount: number,
    paidBy: string,
    splits: api.SplitInput[],
    receiptUrl: string | null,
    createdBy: string
  ) => {
    if (!groupId) return;
    try {
      await api.createExpense(groupId, title, amount, paidBy, splits, receiptUrl, createdBy);
      await loadGroupData();
    } catch (err: any) {
      throw new Error(err.message || 'Failed to add expense.');
    }
  };

  const editExpense = async (
    expenseId: string,
    title: string,
    amount: number,
    paidBy: string,
    splits: api.SplitInput[],
    receiptUrl: string | null
  ) => {
    try {
      await api.updateExpense(expenseId, title, amount, paidBy, splits, receiptUrl);
      await loadGroupData();
    } catch (err: any) {
      throw new Error(err.message || 'Failed to update expense.');
    }
  };

  const removeExpense = async (expenseId: string) => {
    try {
      await api.deleteExpense(expenseId);
      await loadGroupData();
    } catch (err: any) {
      throw new Error(err.message || 'Failed to delete expense.');
    }
  };

  const inviteMemberByExpenseId = async (expenseId: string) => {
    if (!groupId) return;
    try {
      const addedProfile = await api.addMemberByExpenseId(groupId, expenseId);
      await loadGroupData();
      return addedProfile;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to add member.');
    }
  };

  const removeMember = async (profileId: string) => {
    if (!groupId) return;
    try {
      await api.removeGroupMember(groupId, profileId);
      await loadGroupData();
    } catch (err: any) {
      throw new Error(err.message || 'Failed to remove member.');
    }
  };

  return {
    group,
    members,
    expenses,
    debts,
    netBalances,
    loading,
    error,
    refresh: loadGroupData,
    addExpense,
    editExpense,
    removeExpense,
    inviteMemberByExpenseId,
    removeMember,
  };
}
