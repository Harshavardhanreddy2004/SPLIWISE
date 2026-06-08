import { supabase } from '../lib/supabaseClient';
import type { Profile, Group, Expense, Settlement, Activity } from '../types';

// ==========================================
// Profiles Services
// ==========================================

export async function fetchProfileById(id: string): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

export async function fetchProfileByExpenseId(expenseId: string): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('expense_id', expenseId.toUpperCase().trim())
    .single();

  if (error) {
    throw new Error('SplitID not found. Please double-check the code.');
  }
  return data;
}

export async function searchProfilesByExpenseId(expenseIdQuery: string): Promise<Profile[]> {
  const cleanQuery = expenseIdQuery.toUpperCase().trim();
  if (!cleanQuery) return [];
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .ilike('expense_id', `%${cleanQuery}%`)
    .limit(5);

  if (error) throw error;
  return data || [];
}

export async function updateProfile(id: string, updates: Partial<Profile>): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ==========================================
// Groups Services
// ==========================================

export async function fetchUserGroups(profileId: string): Promise<Group[]> {
  const { data, error } = await supabase
    .from('group_members')
    .select('group_id, groups(*)')
    .eq('profile_id', profileId);

  if (error) throw error;
  return (data || []).map((item: any) => item.groups).filter(Boolean);
}

export async function createGroup(name: string, type: string, createdBy: string): Promise<Group> {
  // 1. Insert the group
  const { data: group, error: groupError } = await supabase
    .from('groups')
    .insert({
      name,
      type,
      created_by: createdBy,
    })
    .select()
    .single();

  if (groupError) throw groupError;

  // 2. Add the creator as the first member
  const { error: memberError } = await supabase
    .from('group_members')
    .insert({
      group_id: group.id,
      profile_id: createdBy,
    });

  if (memberError) throw memberError;

  return group;
}

export async function updateGroup(groupId: string, updates: Partial<Group>): Promise<Group> {
  const { data, error } = await supabase
    .from('groups')
    .update(updates)
    .eq('id', groupId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteGroup(groupId: string): Promise<void> {
  const { error } = await supabase
    .from('groups')
    .delete()
    .eq('id', groupId);

  if (error) throw error;
}

export async function addMemberByExpenseId(groupId: string, expenseId: string): Promise<Profile> {
  // 1. Find profile by Expense ID
  const profile = await fetchProfileByExpenseId(expenseId);

  // 2. Add as member
  const { error } = await supabase
    .from('group_members')
    .insert({
      group_id: groupId,
      profile_id: profile.id,
    });

  if (error) {
    if (error.code === '23505') {
      throw new Error('This user is already a member of the group.');
    }
    throw error;
  }

  return profile;
}

export async function addMemberByEmail(groupId: string, email: string): Promise<Profile> {
  // 1. Find profile by Email
  const { data: profile, error: searchError } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', email.toLowerCase().trim())
    .single();

  if (searchError || !profile) {
    throw new Error('No user found with this email address.');
  }

  // 2. Add as member
  const { error } = await supabase
    .from('group_members')
    .insert({
      group_id: groupId,
      profile_id: profile.id,
    });

  if (error) {
    if (error.code === '23505') {
      throw new Error('This user is already a member of the group.');
    }
    throw error;
  }

  return profile;
}

export async function removeGroupMember(groupId: string, profileId: string): Promise<void> {
  const { error } = await supabase
    .from('group_members')
    .delete()
    .eq('group_id', groupId)
    .eq('profile_id', profileId);

  if (error) throw error;
}

export async function fetchGroupMembers(groupId: string): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('group_members')
    .select('profile_id, profiles(*)')
    .eq('group_id', groupId);

  if (error) throw error;
  return (data || []).map((item: any) => item.profiles).filter(Boolean);
}

// ==========================================
// Expenses Services
// ==========================================

export interface SplitInput {
  profileId: string;
  amount: number;
}

export async function fetchGroupExpenses(groupId: string): Promise<Expense[]> {
  const { data, error } = await supabase
    .from('expenses')
    .select('*, profiles!paid_by(*), expense_splits(*, profiles(*))')
    .eq('group_id', groupId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  
  return (data || []).map((exp: any) => ({
    ...exp,
    profile: exp.profiles,
    splits: (exp.expense_splits || []).map((split: any) => ({
      ...split,
      profile: split.profiles,
    })),
  }));
}

export async function createExpense(
  groupId: string,
  title: string,
  amount: number,
  paidBy: string,
  splits: SplitInput[],
  receiptUrl: string | null,
  createdBy: string,
  splitType: 'equal' | 'percentage' | 'exact' = 'equal',
  notes: string | null = null
): Promise<Expense> {
  // 1. Insert expense row
  const { data: expense, error: expError } = await supabase
    .from('expenses')
    .insert({
      group_id: groupId,
      title,
      amount,
      paid_by: paidBy,
      receipt_url: receiptUrl,
      created_by: createdBy,
      split_type: splitType,
      notes: notes,
    })
    .select()
    .single();

  if (expError) throw expError;

  // 2. Insert splits
  const splitsPayload = splits.map((s) => ({
    expense_id: expense.id,
    profile_id: s.profileId,
    amount: s.amount,
  }));

  const { error: splitsError } = await supabase
    .from('expense_splits')
    .insert(splitsPayload);

  if (splitsError) throw splitsError;

  return expense;
}

export async function updateExpense(
  expenseId: string,
  title: string,
  amount: number,
  paidBy: string,
  splits: SplitInput[],
  receiptUrl: string | null,
  splitType: 'equal' | 'percentage' | 'exact' = 'equal',
  notes: string | null = null
): Promise<void> {
  // 1. Update expense row
  const { error: expError } = await supabase
    .from('expenses')
    .update({
      title,
      amount,
      paid_by: paidBy,
      receipt_url: receiptUrl,
      split_type: splitType,
      notes: notes,
    })
    .eq('id', expenseId);

  if (expError) throw expError;

  // 2. Delete existing splits
  const { error: deleteError } = await supabase
    .from('expense_splits')
    .delete()
    .eq('expense_id', expenseId);

  if (deleteError) throw deleteError;

  // 3. Insert new splits
  const splitsPayload = splits.map((s) => ({
    expense_id: expenseId,
    profile_id: s.profileId,
    amount: s.amount,
  }));

  const { error: splitsError } = await supabase
    .from('expense_splits')
    .insert(splitsPayload);

  if (splitsError) throw splitsError;
}

export async function deleteExpense(expenseId: string): Promise<void> {
  const { error } = await supabase
    .from('expenses')
    .delete()
    .eq('id', expenseId);

  if (error) throw error;
}

// ==========================================
// Settlements Services
// ==========================================

export async function fetchGroupSettlements(groupId: string): Promise<Settlement[]> {
  const { data, error } = await supabase
    .from('settlements')
    .select('*, payer:profiles!payer_id(*), payee:profiles!payee_id(*)')
    .eq('group_id', groupId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createSettlement(
  groupId: string,
  payerId: string,
  payeeId: string,
  amount: number,
  createdBy: string
): Promise<Settlement> {
  const { data, error } = await supabase
    .from('settlements')
    .insert({
      group_id: groupId,
      payer_id: payerId,
      payee_id: payeeId,
      amount,
      created_by: createdBy,
    })
    .select('*, payer:profiles!payer_id(*), payee:profiles!payee_id(*)')
    .single();

  if (error) throw error;
  return data;
}

// ==========================================
// Activities Services
// ==========================================

export async function fetchGroupActivities(groupId: string): Promise<Activity[]> {
  const { data, error } = await supabase
    .from('activities')
    .select('*, profile:profiles(*), groups(name)')
    .eq('group_id', groupId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw error;
  return (data || []).map((act: any) => ({
    ...act,
    groupName: act.groups?.name,
  }));
}
