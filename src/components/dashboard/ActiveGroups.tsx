import React from 'react';
import { Palmtree, Home, Heart, Coffee, ChevronRight } from 'lucide-react';
import type { GroupSummary } from '../../types';
import { formatCurrency } from '../../utils/expense';

interface ActiveGroupsProps {
  groups: GroupSummary[];
  onSelectGroup: (groupId: string) => void;
  onNavigate: (view: string) => void;
}

export const ActiveGroups: React.FC<ActiveGroupsProps> = ({
  groups,
  onSelectGroup,
  onNavigate,
}) => {
  const getGroupIcon = (type: string) => {
    switch (type) {
      case 'trip':
        return <Palmtree className="w-5 h-5" />;
      case 'home':
        return <Home className="w-5 h-5" />;
      case 'couple':
        return <Heart className="w-5 h-5" />;
      default:
        return <Coffee className="w-5 h-5" />;
    }
  };

  const getGroupColorClass = (type: string) => {
    switch (type) {
      case 'trip':
        return 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400';
      case 'home':
        return 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400';
      case 'couple':
        return 'bg-rose-500/10 border-rose-500/20 text-rose-400';
      default:
        return 'bg-zinc-500/10 border-zinc-500/20 text-zinc-400';
    }
  };

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold tracking-wide text-zinc-500 dark:text-zinc-400 uppercase">
          Active Groups
        </h3>
        <span className="text-xs text-zinc-500">{groups.length} total</span>
      </div>

      {groups.length === 0 ? (
        <div className="glass rounded-2xl p-6 text-center border border-dashed border-white/10">
          <p className="text-sm text-zinc-400 mb-4">No active groups found.</p>
          <button
            onClick={() => onNavigate('create-group')}
            className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-medium hover:bg-indigo-500 transition active:scale-95"
          >
            Create Your First Group
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map(({ group, membersCount, lastActive, userNetBalance }) => (
            <div
              key={group.id}
              onClick={() => onSelectGroup(group.id)}
              className="glass rounded-2xl p-4 flex items-center justify-between cursor-pointer hover:bg-white/[0.06] border hover:border-white/15 transition-all duration-200 shadow-md group"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`h-11 w-11 rounded-xl border flex items-center justify-center ${getGroupColorClass(
                    group.type
                  )}`}
                >
                  {getGroupIcon(group.type)}
                </div>
                <div>
                  <h4 className="font-medium text-sm text-zinc-800 dark:text-zinc-100 group-hover:text-indigo-400 transition-colors">
                    {group.name}
                  </h4>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    {membersCount} member{membersCount !== 1 ? 's' : ''} • Active {lastActive}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-right">
                  <span className="text-[10px] block text-zinc-400">Status</span>
                  {userNetBalance > 0.01 ? (
                    <span className="text-xs font-semibold text-emerald-500 dark:text-emerald-400">
                      Owed {formatCurrency(userNetBalance)}
                    </span>
                  ) : userNetBalance < -0.01 ? (
                    <span className="text-xs font-semibold text-rose-500 dark:text-rose-400">
                      You owe {formatCurrency(Math.abs(userNetBalance))}
                    </span>
                  ) : (
                    <span className="text-xs font-semibold text-zinc-400">
                      Settled Up
                    </span>
                  )}
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
