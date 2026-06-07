import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '../services/api';
import { supabase } from '../lib/supabaseClient';
import { calculateBalances } from '../utils/expense';
import type { Group } from '../types';

export function useUserProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ['profile', userId],
    queryFn: () => (userId ? api.fetchProfileById(userId) : null),
    enabled: !!userId,
  });
}

export function useUserGroups(profileId: string | undefined) {
  return useQuery({
    queryKey: ['groups', profileId],
    queryFn: () => (profileId ? api.fetchUserGroups(profileId) : []),
    enabled: !!profileId,
  });
}

export function useGroupDetails(groupId: string | null) {
  const queryClient = useQueryClient();

  const metadataQuery = useQuery({
    queryKey: ['group-metadata', groupId],
    queryFn: async () => {
      if (!groupId) return null;
      const { data, error } = await supabase
        .from('groups')
        .select('*')
        .eq('id', groupId)
        .single();
      if (error) throw error;
      return data as Group;
    },
    enabled: !!groupId,
  });

  const membersQuery = useQuery({
    queryKey: ['group-members', groupId],
    queryFn: () => (groupId ? api.fetchGroupMembers(groupId) : []),
    enabled: !!groupId,
  });

  const expensesQuery = useQuery({
    queryKey: ['group-expenses', groupId],
    queryFn: () => (groupId ? api.fetchGroupExpenses(groupId) : []),
    enabled: !!groupId,
  });

  const settlementsQuery = useQuery({
    queryKey: ['group-settlements', groupId],
    queryFn: () => (groupId ? api.fetchGroupSettlements(groupId) : []),
    enabled: !!groupId,
  });

  const activitiesQuery = useQuery({
    queryKey: ['group-activities', groupId],
    queryFn: () => (groupId ? api.fetchGroupActivities(groupId) : []),
    enabled: !!groupId,
  });

  const members = membersQuery.data || [];
  const expenses = expensesQuery.data || [];

  const { netBalances, debts } = calculateBalances(members, expenses);

  const refetchAll = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['group-metadata', groupId] }),
      queryClient.invalidateQueries({ queryKey: ['group-members', groupId] }),
      queryClient.invalidateQueries({ queryKey: ['group-expenses', groupId] }),
      queryClient.invalidateQueries({ queryKey: ['group-settlements', groupId] }),
      queryClient.invalidateQueries({ queryKey: ['group-activities', groupId] }),
    ]);
  };

  return {
    group: metadataQuery.data,
    members,
    expenses,
    settlements: settlementsQuery.data || [],
    activities: activitiesQuery.data || [],
    netBalances,
    debts,
    loading:
      metadataQuery.isLoading ||
      membersQuery.isLoading ||
      expensesQuery.isLoading ||
      settlementsQuery.isLoading ||
      activitiesQuery.isLoading,
    error:
      metadataQuery.error ||
      membersQuery.error ||
      expensesQuery.error ||
      settlementsQuery.error ||
      activitiesQuery.error,
    refetch: refetchAll,
  };
}

// ==========================================
// Mutations
// ==========================================

export function useGroupMutations(profileId: string | undefined) {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: ({ name, type }: { name: string; type: string }) => {
      if (!profileId) throw new Error('No profile id provided');
      return api.createGroup(name, type, profileId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups', profileId] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ groupId, updates }: { groupId: string; updates: Partial<Group> }) =>
      api.updateGroup(groupId, updates),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['group-metadata', variables.groupId] });
      queryClient.invalidateQueries({ queryKey: ['groups', profileId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (groupId: string) => api.deleteGroup(groupId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups', profileId] });
    },
  });

  return {
    createGroup: createMutation.mutateAsync,
    updateGroup: updateMutation.mutateAsync,
    deleteGroup: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

export function useMemberMutations(groupId: string) {
  const queryClient = useQueryClient();

  const inviteMutation = useMutation({
    mutationFn: (expenseId: string) => api.addMemberByExpenseId(groupId, expenseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-members', groupId] });
      queryClient.invalidateQueries({ queryKey: ['group-activities', groupId] });
    },
  });

  const removeMutation = useMutation({
    mutationFn: (profileId: string) => api.removeGroupMember(groupId, profileId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-members', groupId] });
      queryClient.invalidateQueries({ queryKey: ['group-expenses', groupId] });
      queryClient.invalidateQueries({ queryKey: ['group-activities', groupId] });
    },
  });

  return {
    inviteMember: inviteMutation.mutateAsync,
    removeMember: removeMutation.mutateAsync,
    isInviting: inviteMutation.isPending,
    isRemoving: removeMutation.isPending,
  };
}

export function useExpenseMutations(groupId: string | null) {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: ({
      groupId: argGroupId,
      title,
      amount,
      paidBy,
      splits,
      receiptUrl,
      createdBy,
      splitType,
      notes,
    }: {
      groupId?: string;
      title: string;
      amount: number;
      paidBy: string;
      splits: api.SplitInput[];
      receiptUrl: string | null;
      createdBy: string;
      splitType: 'equal' | 'percentage' | 'exact';
      notes: string | null;
    }) => {
      const activeGroupId = argGroupId || groupId;
      if (!activeGroupId) throw new Error('No group ID provided for expense creation.');
      return api.createExpense(
        activeGroupId,
        title,
        amount,
        paidBy,
        splits,
        receiptUrl,
        createdBy,
        splitType,
        notes
      );
    },
    onSuccess: (_, variables) => {
      const activeGroupId = variables.groupId || groupId;
      if (activeGroupId) {
        queryClient.invalidateQueries({ queryKey: ['group-expenses', activeGroupId] });
        queryClient.invalidateQueries({ queryKey: ['group-activities', activeGroupId] });
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      expenseId,
      groupId: argGroupId,
      title,
      amount,
      paidBy,
      splits,
      receiptUrl,
      splitType,
      notes,
    }: {
      expenseId: string;
      groupId?: string;
      title: string;
      amount: number;
      paidBy: string;
      splits: api.SplitInput[];
      receiptUrl: string | null;
      splitType: 'equal' | 'percentage' | 'exact';
      notes: string | null;
    }) =>
      api.updateExpense(
        expenseId,
        title,
        amount,
        paidBy,
        splits,
        receiptUrl,
        splitType,
        notes
      ),
    onSuccess: (_, variables) => {
      const activeGroupId = variables.groupId || groupId;
      if (activeGroupId) {
        queryClient.invalidateQueries({ queryKey: ['group-expenses', activeGroupId] });
        queryClient.invalidateQueries({ queryKey: ['group-activities', activeGroupId] });
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (expenseId: string) => api.deleteExpense(expenseId),
    onSuccess: () => {
      if (groupId) {
        queryClient.invalidateQueries({ queryKey: ['group-expenses', groupId] });
        queryClient.invalidateQueries({ queryKey: ['group-activities', groupId] });
      }
    },
  });

  return {
    createExpense: createMutation.mutateAsync,
    updateExpense: updateMutation.mutateAsync,
    deleteExpense: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

export function useSettlementMutations(groupId: string | null) {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: ({
      payerId,
      payeeId,
      amount,
      createdBy,
    }: {
      payerId: string;
      payeeId: string;
      amount: number;
      createdBy: string;
    }) => api.createSettlement(groupId!, payerId, payeeId, amount, createdBy),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-settlements', groupId] });
      queryClient.invalidateQueries({ queryKey: ['group-activities', groupId] });
      // Invalidate expenses too since a settlement impacts balances (we also recalculate suggested settlements based on expenses,
      // and we log settlements as both expense and settlement table rows for historical logging).
      queryClient.invalidateQueries({ queryKey: ['group-expenses', groupId] });
    },
  });

  return {
    createSettlement: createMutation.mutateAsync,
    isSettling: createMutation.isPending,
  };
}
