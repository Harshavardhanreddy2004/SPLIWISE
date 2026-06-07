import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useUserGroups } from '../hooks/useQueries';
import * as api from '../services/api';
import { supabase } from '../lib/supabaseClient';
import type { GroupSummary } from '../types';
import { calculateBalances } from '../utils/expense';
import { Plus, Search, ChevronRight, Coffee, Palmtree, Home, Heart, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';

interface GroupsListPageProps {
  onNavigate: (view: string) => void;
  onSelectGroup: (groupId: string) => void;
  showToast: (msg: string, type: 'success' | 'error') => void;
}

export const GroupsListPage: React.FC<GroupsListPageProps> = ({
  onNavigate,
  onSelectGroup,
  showToast,
}) => {
  const { profile } = useAuth();
  const { data: userGroups = [], isLoading: loadingGroups, refetch: refetchGroups } = useUserGroups(profile?.id);

  const [summaries, setSummaries] = useState<GroupSummary[]>([]);
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [joinGroupId, setJoinGroupId] = useState('');
  const [joining, setJoining] = useState(false);

  const loadMetrics = async () => {
    if (!profile || userGroups.length === 0) {
      setSummaries([]);
      return;
    }
    setLoadingMetrics(true);
    try {
      const items: GroupSummary[] = [];
      for (const group of userGroups) {
        const [members, expenses] = await Promise.all([
          api.fetchGroupMembers(group.id),
          api.fetchGroupExpenses(group.id),
        ]);
        const { netBalances } = calculateBalances(members, expenses);
        const userBalance = netBalances[profile.id] || 0;

        items.push({
          group,
          membersCount: members.length,
          lastActive: expenses.length > 0 ? new Date(expenses[0].created_at).toLocaleDateString() : 'New',
          userNetBalance: userBalance,
        });
      }
      setSummaries(items);
    } catch (err) {
      console.error(err);
      showToast('Failed to load group details.', 'error');
    } finally {
      setLoadingMetrics(false);
    }
  };

  useEffect(() => {
    loadMetrics();
  }, [userGroups, profile]);

  const handleJoinGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !joinGroupId.trim()) return;

    const trimmedGroupId = joinGroupId.trim();
    setJoining(true);
    try {
      // 1. Verify group exists
      const { data: group, error: groupErr } = await supabase
        .from('groups')
        .select('*')
        .eq('id', trimmedGroupId)
        .single();

      if (groupErr || !group) {
        throw new Error('Group not found. Verify the Group ID.');
      }

      // 2. Add current profile as member
      const { error: joinErr } = await supabase
        .from('group_members')
        .insert({
          group_id: trimmedGroupId,
          profile_id: profile.id,
        });

      if (joinErr) {
        if (joinErr.code === '23505') {
          throw new Error('You are already a member of this group.');
        }
        throw joinErr;
      }

      showToast(`Successfully joined "${group.name}"!`, 'success');
      setJoinGroupId('');
      await refetchGroups();
      onSelectGroup(trimmedGroupId);
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Failed to join group.', 'error');
    } finally {
      setJoining(false);
    }
  };

  const getGroupIcon = (type: string) => {
    switch (type) {
      case 'trip':
        return <Palmtree className="w-5 h-5 text-indigo-400" />;
      case 'home':
        return <Home className="w-5 h-5 text-emerald-400" />;
      case 'couple':
        return <Heart className="w-5 h-5 text-rose-400" />;
      default:
        return <Coffee className="w-5 h-5 text-zinc-400" />;
    }
  };

  const filteredGroups = summaries.filter((summary) =>
    summary.group.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isSyncing = loadingGroups || loadingMetrics;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, filter: 'blur(4px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      exit={{ opacity: 0, y: -12, filter: 'blur(4px)' }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-6 pb-10 max-w-3xl mx-auto"
    >
      {/* Page Title & Actions */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold tracking-tight text-zinc-100">
          Your Groups
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => refetchGroups()}
            className="p-2 glass rounded-xl text-zinc-500 hover:text-white transition active:scale-95 border border-white/5"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-indigo-400' : ''}`} />
          </button>
          <button
            onClick={() => onNavigate('create-group')}
            className="h-9 px-3 bg-white text-zinc-950 rounded-xl flex items-center gap-1.5 text-xs font-bold hover:bg-zinc-200 transition active:scale-95 shadow"
          >
            <Plus className="w-4 h-4" /> Create Group
          </button>
        </div>
      </div>

      {/* Join Group Input Panel */}
      <div className="glass rounded-2xl p-4 border border-white/5 shadow-lg">
        <span className="text-xs font-semibold text-zinc-400 block mb-2">
          Join Group by Code
        </span>
        <form onSubmit={handleJoinGroup} className="flex gap-2">
          <input
            type="text"
            placeholder="Paste Group ID (UUID) code"
            value={joinGroupId}
            onChange={(e) => setJoinGroupId(e.target.value)}
            className="flex-1 glass-input rounded-xl px-4 py-2.5 text-xs placeholder-zinc-500"
            required
            disabled={joining}
          />
          <button
            type="submit"
            disabled={joining || !joinGroupId.trim()}
            className="bg-white/10 hover:bg-white/20 text-white px-4 rounded-xl text-xs font-semibold border border-white/10 transition active:scale-[0.98] flex items-center justify-center min-w-[70px]"
          >
            {joining ? 'Joining...' : 'Join'}
          </button>
        </form>
      </div>

      {/* Search Filter bar */}
      <div className="relative">
        <Search className="absolute left-3.5 top-3 w-4 h-4 text-zinc-500" />
        <input
          type="text"
          placeholder="Search groups..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full glass-input rounded-xl pl-10 pr-4 py-2.5 text-sm placeholder-zinc-500"
        />
      </div>

      {/* Group Directory List */}
      {isSyncing && summaries.length === 0 ? (
        <div className="text-center py-12">
          <RefreshCw className="w-6 h-6 text-indigo-400 animate-spin mx-auto mb-2" />
          <span className="text-xs text-zinc-500">Syncing ledger groups...</span>
        </div>
      ) : filteredGroups.length === 0 ? (
        <div className="glass rounded-2xl p-8 text-center border border-white/5">
          <p className="text-sm text-zinc-500">
            {searchQuery ? 'No matching groups found.' : "You haven't joined any groups yet."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredGroups.map(({ group, membersCount, lastActive, userNetBalance }) => (
            <div
              key={group.id}
              onClick={() => onSelectGroup(group.id)}
              className="glass rounded-2xl p-4 flex items-center justify-between cursor-pointer hover:bg-white/[0.05] border border-white/5 hover:border-white/10 transition-all duration-200 shadow-md group"
            >
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                  {getGroupIcon(group.type)}
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-zinc-200 group-hover:text-indigo-400 transition-colors">
                    {group.name}
                  </h4>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    {membersCount} member{membersCount !== 1 ? 's' : ''} • Last active {lastActive}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-right">
                  {userNetBalance > 0.01 ? (
                    <span className="text-xs font-bold text-emerald-450 dark:text-emerald-400 block">
                      +${userNetBalance.toFixed(2)}
                    </span>
                  ) : userNetBalance < -0.01 ? (
                    <span className="text-xs font-bold text-rose-405 dark:text-rose-400 block">
                      -${Math.abs(userNetBalance).toFixed(2)}
                    </span>
                  ) : (
                    <span className="text-xs font-semibold text-zinc-400 block">
                      $0.00
                    </span>
                  )}
                  <span className="text-[9px] text-zinc-500 block">Net Balance</span>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
};
export default GroupsListPage;
