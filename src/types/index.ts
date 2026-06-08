export interface Profile {
  id: string;
  name: string;
  email: string;
  expense_id: string;
  avatar_url?: string | null;
  created_at?: string;
}

export interface Group {
  id: string;
  name: string;
  type: 'trip' | 'home' | 'couple' | 'other';
  created_by: string;
  created_at: string;
}

export interface GroupMember {
  id: string;
  group_id: string;
  profile_id: string;
  joined_at: string;
  profile?: Profile;
}

export interface Expense {
  id: string;
  group_id: string;
  title: string;
  amount: number;
  paid_by: string;
  receipt_url?: string | null;
  notes?: string | null;
  split_type: 'equal' | 'percentage' | 'exact';
  created_by: string;
  created_at: string;
  profile?: Profile; // Payer Profile
  splits?: ExpenseSplit[];
}

export interface ExpenseSplit {
  id: string;
  expense_id: string;
  profile_id: string;
  amount: number;
  created_at: string;
  profile?: Profile;
}

export interface Settlement {
  id: string;
  group_id: string;
  payer_id: string;
  payee_id: string;
  amount: number;
  created_by: string;
  created_at: string;
  payer?: Profile;
  payee?: Profile;
}

export interface Activity {
  id: string;
  group_id: string;
  profile_id: string;
  action_type:
    | 'expense_created'
    | 'expense_updated'
    | 'expense_deleted'
    | 'settlement_created'
    | 'member_joined'
    | 'member_removed';
  metadata: {
    expense_title?: string;
    amount?: number;
    payer_name?: string;
    payee_name?: string;
    member_name?: string;
  };
  created_at: string;
  profile?: Profile; // User who did the action
  groupName?: string;
}

export interface Debt {
  fromProfileId: string;
  fromName: string;
  toProfileId: string;
  toName: string;
  amount: number;
}

export interface GroupSummary {
  group: Group;
  membersCount: number;
  lastActive: string;
  userNetBalance: number; // Positive if user is owed, negative if user owes
}
