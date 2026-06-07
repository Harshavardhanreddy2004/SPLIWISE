import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useGroupMutations } from '../hooks/useQueries';
import * as api from '../services/api';
import { supabase } from '../lib/supabaseClient';
import type { Profile } from '../types';
import { ChevronLeft, Palmtree, Home, Heart, Coffee, X } from 'lucide-react';
import { motion } from 'framer-motion';

interface CreateGroupPageProps {
  onNavigate: (view: string) => void;
  onSelectGroup: (groupId: string) => void;
  showToast: (msg: string, type: 'success' | 'error') => void;
}

export const CreateGroupPage: React.FC<CreateGroupPageProps> = ({
  onNavigate,
  onSelectGroup,
  showToast,
}) => {
  const { profile } = useAuth();
  const { createGroup, isCreating } = useGroupMutations(profile?.id);

  const [groupName, setGroupName] = useState('');
  const [groupType, setGroupType] = useState<'trip' | 'home' | 'couple' | 'other'>('trip');
  const [inviteInput, setInviteInput] = useState('');
  const [invitedMembers, setInvitedMembers] = useState<Profile[]>([]);
  const [addingMember, setAddingMember] = useState(false);

  const handleAddMember = async () => {
    const term = inviteInput.trim();
    if (!term) return;

    if (
      term.toLowerCase() === profile?.email.toLowerCase() ||
      term.toUpperCase() === profile?.expense_id.toUpperCase()
    ) {
      showToast('You are automatically added as the group creator.', 'error');
      return;
    }

    if (
      invitedMembers.some(
        (m) =>
          m.email.toLowerCase() === term.toLowerCase() ||
          m.expense_id.toUpperCase() === term.toUpperCase()
      )
    ) {
      showToast('This member is already added to the invite list.', 'error');
      return;
    }

    setAddingMember(true);
    try {
      let foundProfile: Profile;

      // Handle SplitID prefix formats (both SPL- and old SID- for flexibility)
      const isSplitID = term.toUpperCase().startsWith('SPL-') || term.toUpperCase().startsWith('SID-');
      if (isSplitID) {
        foundProfile = await api.fetchProfileByExpenseId(term);
      } else if (term.includes('@')) {
        // Find profile by email
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('email', term.toLowerCase())
          .single();
        if (error || !data) {
          throw new Error('No user found with that email address.');
        }
        foundProfile = data;
      } else {
        throw new Error('Enter a valid SplitID (e.g. SPL-XXXXXX) or an email address.');
      }

      setInvitedMembers((prev) => [...prev, foundProfile]);
      setInviteInput('');
      showToast(`Added ${foundProfile.name} to the list!`, 'success');
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Could not find user.', 'error');
    } finally {
      setAddingMember(false);
    }
  };

  const handleRemoveInvited = (id: string) => {
    setInvitedMembers((prev) => prev.filter((m) => m.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || isCreating) return;

    if (!groupName.trim()) {
      showToast('Please enter a group name.', 'error');
      return;
    }

    try {
      // 1. Create group and add creator as member
      const group = await createGroup({
        name: groupName.trim(),
        type: groupType,
      });

      // 2. Add other invited members
      if (invitedMembers.length > 0) {
        const membersPayload = invitedMembers.map((m) => ({
          group_id: group.id,
          profile_id: m.id,
        }));

        const { error: membersErr } = await supabase
          .from('group_members')
          .insert(membersPayload);

        if (membersErr) throw membersErr;
      }

      showToast(`Group "${groupName}" created successfully!`, 'success');
      onSelectGroup(group.id);
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Failed to create group.', 'error');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, filter: 'blur(4px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      exit={{ opacity: 0, y: -12, filter: 'blur(4px)' }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-6 pb-10 max-w-3xl mx-auto"
    >
      {/* Header Back Routing */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => onNavigate('dashboard')}
          className="w-9 h-9 glass rounded-xl flex items-center justify-center text-zinc-500 hover:text-zinc-200 hover:bg-white/5 active:scale-95 transition border border-white/5"
        >
          <ChevronLeft className="w-5 h-5 text-zinc-200" />
        </button>
        <h2 className="text-xl font-bold tracking-tight text-zinc-100">
          Create New Group
        </h2>
      </div>

      {/* Main Glass Form */}
      <form onSubmit={handleSubmit} className="glass rounded-2xl p-5 shadow-xl space-y-5 border border-white/5">
        {/* Group Name input */}
        <div>
          <label className="block text-xs font-semibold text-zinc-400 mb-1.5 ml-1">
            Group Name
          </label>
          <input
            type="text"
            placeholder="e.g. Bali Trip 2026, Roomies 402"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            className="w-full glass-input rounded-xl px-4 py-3 text-sm"
            required
            disabled={isCreating}
          />
        </div>

        {/* Group Type Selector Grid */}
        <div>
          <label className="block text-xs font-semibold text-zinc-400 mb-1.5 ml-1">
            Group Type
          </label>
          <div className="grid grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() => setGroupType('trip')}
              className={`glass p-3 rounded-xl flex flex-col items-center justify-center gap-1.5 border transition active:scale-95 ${
                groupType === 'trip'
                  ? 'border-indigo-500/40 bg-indigo-500/10 text-indigo-400'
                  : 'hover:bg-white/5 border-white/5 text-zinc-500'
              }`}
            >
              <Palmtree className="w-4 h-4" />
              <span className="text-[10px] font-semibold">Trip</span>
            </button>
            <button
              type="button"
              onClick={() => setGroupType('home')}
              className={`glass p-3 rounded-xl flex flex-col items-center justify-center gap-1.5 border transition active:scale-95 ${
                groupType === 'home'
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                  : 'hover:bg-white/5 border-white/5 text-zinc-500'
              }`}
            >
              <Home className="w-4 h-4" />
              <span className="text-[10px] font-semibold">Home</span>
            </button>
            <button
              type="button"
              onClick={() => setGroupType('couple')}
              className={`glass p-3 rounded-xl flex flex-col items-center justify-center gap-1.5 border transition active:scale-95 ${
                groupType === 'couple'
                  ? 'border-rose-500/40 bg-rose-500/10 text-rose-400'
                  : 'hover:bg-white/5 border-white/5 text-zinc-500'
              }`}
            >
              <Heart className="w-4 h-4" />
              <span className="text-[10px] font-semibold">Couple</span>
            </button>
            <button
              type="button"
              onClick={() => setGroupType('other')}
              className={`glass p-3 rounded-xl flex flex-col items-center justify-center gap-1.5 border transition active:scale-95 ${
                groupType === 'other'
                  ? 'border-zinc-550/40 bg-zinc-500/10 text-zinc-300'
                  : 'hover:bg-white/5 border-white/5 text-zinc-500'
              }`}
            >
              <Coffee className="w-4 h-4" />
              <span className="text-[10px] font-semibold">Other</span>
            </button>
          </div>
        </div>

        {/* Invite Member inputs */}
        <div>
          <div className="flex items-center justify-between mb-1.5 ml-1">
            <label className="block text-xs font-semibold text-zinc-400">
              Invite Members
            </label>
            <span className="text-[10px] text-zinc-500">By SplitID or Email</span>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. SPL-XXXXXX or email"
              value={inviteInput}
              onChange={(e) => setInviteInput(e.target.value)}
              className="flex-1 glass-input rounded-xl px-4 py-2.5 text-xs placeholder-zinc-500"
              disabled={isCreating || addingMember}
            />
            <button
              type="button"
              onClick={handleAddMember}
              disabled={isCreating || addingMember || !inviteInput.trim()}
              className="bg-white/10 hover:bg-white/20 px-4 rounded-xl border border-white/10 text-xs font-semibold text-white transition active:scale-[0.98] min-w-[60px]"
            >
              {addingMember ? '...' : 'Add'}
            </button>
          </div>
        </div>

        {/* Invited Members tags */}
        <div className="space-y-2 max-h-40 overflow-y-auto no-scrollbar">
          {/* Creator tag */}
          {profile && (
            <div className="flex items-center justify-between p-2.5 glass rounded-xl bg-white/[0.01] border border-white/5">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-white border border-white/10">
                  {profile.name[0].toUpperCase()}
                </div>
                <span className="text-xs font-medium text-zinc-200">
                  {profile.name} (You)
                </span>
              </div>
              <span className="text-[9px] bg-indigo-500/10 px-2 py-0.5 rounded-md text-indigo-400 border border-indigo-500/20 font-bold uppercase">
                Creator
              </span>
            </div>
          )}

          {/* Other invites */}
          {invitedMembers.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between p-2.5 glass rounded-xl bg-white/[0.01] border border-white/5 animate-fade-in"
            >
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-zinc-700 flex items-center justify-center text-[10px] font-bold text-zinc-250 border border-white/5">
                  {member.name[0].toUpperCase()}
                </div>
                <span className="text-xs font-medium text-zinc-200 truncate max-w-[185px]">
                  {member.name}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleRemoveInvited(member.id)}
                className="text-zinc-400 hover:text-rose-400 p-1 rounded-lg hover:bg-white/5 transition"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isCreating}
          className="w-full bg-white text-zinc-950 font-bold text-sm rounded-xl py-3 mt-4 hover:bg-zinc-200 transition active:scale-[0.98] shadow-lg shadow-black/20"
        >
          {isCreating ? 'Creating...' : 'Create Group'}
        </button>
      </form>
    </motion.div>
  );
};
export default CreateGroupPage;
