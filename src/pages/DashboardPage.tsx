import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';

import { useUserGroups } from '../hooks/useQueries';
import * as api from '../services/api';
import { calculateBalances } from '../utils/expense';
import { BalanceCard } from '../components/dashboard/BalanceCard';
import { ActiveGroups } from '../components/dashboard/ActiveGroups';
import { ActivityFeed } from '../components/dashboard/ActivityFeed';
import { PlusCircle, Receipt, RefreshCw, Activity as ActivityIcon } from 'lucide-react';
import type { GroupSummary, Activity } from '../types';
import { motion } from 'framer-motion';

interface DashboardPageProps {
  onNavigate: (view: string) => void;
  onSelectGroup: (groupId: string) => void;
  onAddExpenseClick: () => void;
  showToast: (msg: string, type: 'success' | 'error') => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onNavigate,
  onSelectGroup,
  onAddExpenseClick,
  showToast,
}) => {
  const { profile } = useAuth();
  const { data: userGroups = [], isLoading: loadingGroups, refetch: refetchGroups } = useUserGroups(profile?.id);

  const [loadingMetrics, setLoadingMetrics] = useState(true);
  const [groupsData, setGroupsData] = useState<GroupSummary[]>([]);
  const [globalActivities, setGlobalActivities] = useState<Activity[]>([]);
  const [totalOwed, setTotalOwed] = useState(0);
  const [totalOwe, setTotalOwe] = useState(0);
  const [owedCount, setOwedCount] = useState(0);
  const [oweCount, setOweCount] = useState(0);

  const loadDashboardMetrics = async () => {
    if (!profile || userGroups.length === 0) {
      setGroupsData([]);
      setGlobalActivities([]);
      setTotalOwed(0);
      setTotalOwe(0);
      setOwedCount(0);
      setOweCount(0);
      setLoadingMetrics(false);
      return;
    }

    setLoadingMetrics(true);
    try {
      const summaries: GroupSummary[] = [];
      const activitiesList: Activity[] = [];
      let owedSum = 0;
      let oweSum = 0;
      let owedGroups = 0;
      let oweGroups = 0;

      // Batch query details for each group
      for (const group of userGroups) {
        const [members, expenses, groupActs] = await Promise.all([
          api.fetchGroupMembers(group.id),
          api.fetchGroupExpenses(group.id),
          api.fetchGroupActivities(group.id),
        ]);

        const { netBalances } = calculateBalances(members, expenses);
        const userBalance = netBalances[profile.id] || 0;

        if (userBalance > 0.01) {
          owedSum += userBalance;
          owedGroups++;
        } else if (userBalance < -0.01) {
          oweSum += Math.abs(userBalance);
          oweGroups++;
        }

        // Gather activities
        groupActs.forEach((act) => {
          activitiesList.push(act);
        });

        // Activity date representation helper
        let lastActive = 'Inactive';
        if (expenses.length > 0) {
          const latestDate = new Date(expenses[0].created_at);
          const now = new Date();
          const diffTime = Math.abs(now.getTime() - latestDate.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          if (diffDays <= 1) lastActive = 'today';
          else if (diffDays === 2) lastActive = 'yesterday';
          else lastActive = `${diffDays - 1} days ago`;
        } else {
          lastActive = 'new group';
        }

        summaries.push({
          group,
          membersCount: members.length,
          lastActive,
          userNetBalance: userBalance,
        });
      }

      // Sort global activities by date descending
      activitiesList.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setGroupsData(summaries);
      setGlobalActivities(activitiesList.slice(0, 15)); // top 15 events
      setTotalOwed(owedSum);
      setTotalOwe(oweSum);
      setOwedCount(owedGroups);
      setOweCount(oweGroups);
    } catch (err) {
      console.error(err);
      showToast('Error syncing dashboard metrics.', 'error');
    } finally {
      setLoadingMetrics(false);
    }
  };

  useEffect(() => {
    loadDashboardMetrics();
  }, [userGroups, profile]);

  const handleRefresh = async () => {
    await refetchGroups();
    await loadDashboardMetrics();
    showToast('Dashboard metrics synced!', 'success');
  };

  const isSyncing = loadingGroups || loadingMetrics;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, filter: 'blur(4px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      exit={{ opacity: 0, y: -12, filter: 'blur(4px)' }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-6 pb-10 max-w-3xl mx-auto"
    >
      {/* Sync Indicators */}
      <div className="flex justify-between items-center px-1">
        <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-500">Overview</h2>
        <button
          onClick={handleRefresh}
          disabled={isSyncing}
          className="p-1.5 glass rounded-lg text-zinc-500 hover:text-white transition active:scale-95 flex items-center justify-center gap-1 border border-white/5 shadow-sm"
          title="Refresh Feed"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-indigo-400' : ''}`} />
        </button>
      </div>

      {/* Balances Card Row */}
      <BalanceCard
        totalOwed={totalOwed}
        totalOwe={totalOwe}
        owedCount={owedCount}
        oweCount={oweCount}
      />

      {/* Action Buttons Row */}
      <div className="flex gap-3">
        <button
          onClick={() => onNavigate('create-group')}
          className="flex-1 glass rounded-xl py-3 px-4 flex items-center justify-center gap-2 text-sm font-semibold border-dashed border-white/10 hover:bg-white/5 transition-all text-zinc-300 shadow"
        >
          <PlusCircle className="w-4 h-4 text-zinc-400" />
          <span>Create Group</span>
        </button>
        <button
          onClick={onAddExpenseClick}
          className="flex-1 bg-white text-zinc-950 rounded-xl py-3 px-4 flex items-center justify-center gap-2 text-sm font-semibold hover:bg-zinc-200 transition-all shadow-lg"
        >
          <Receipt className="w-4 h-4 text-zinc-900" />
          <span>Add Expense</span>
        </button>
      </div>

      {/* Active Groups Section */}
      <ActiveGroups
        groups={groupsData}
        onSelectGroup={onSelectGroup}
        onNavigate={onNavigate}
      />

      {/* Global Activity Feed Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-bold tracking-widest text-zinc-500 uppercase flex items-center gap-1.5">
            <ActivityIcon className="w-3.5 h-3.5 text-zinc-500" />
            <span>Activity Feed</span>
          </h3>
          <span className="text-[10px] text-zinc-600 font-semibold uppercase">Real-time logs</span>
        </div>

        <ActivityFeed activities={globalActivities} loading={isSyncing} />
      </div>
    </motion.div>
  );
};
export default DashboardPage;
