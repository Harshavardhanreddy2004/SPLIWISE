-- SplitFlow Database Schema
-- Run this in your Supabase SQL Editor (https://supabase.com)

-- Enable UUID extension if not enabled
create extension if not exists "uuid-ossp";

-- 1. Create Tables

-- Create Profiles Table
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  name text not null,
  email text unique not null,
  expense_id text unique not null,
  avatar_url text,
  created_at timestamp with time zone default now()
);

-- Create Groups Table
create table if not exists public.groups (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  type text default 'other', -- 'trip', 'home', 'couple', 'other'
  created_by uuid default auth.uid() references public.profiles(id) on delete set null,
  created_at timestamp with time zone default now()
);

-- Create Group Members Table
create table if not exists public.group_members (
  id uuid default gen_random_uuid() primary key,
  group_id uuid references public.groups(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete cascade,
  joined_at timestamp with time zone default now(),
  constraint group_members_unique unique (group_id, profile_id)
);

-- Create Expenses Table
create table if not exists public.expenses (
  id uuid default gen_random_uuid() primary key,
  group_id uuid references public.groups(id) on delete cascade,
  title text not null,
  amount numeric(10, 2) not null check (amount > 0),
  paid_by uuid references public.profiles(id) on delete cascade,
  receipt_url text,
  notes text,
  split_type text default 'equal', -- 'equal', 'percentage', 'exact'
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamp with time zone default now()
);

-- Create Expense Splits Table
create table if not exists public.expense_splits (
  id uuid default gen_random_uuid() primary key,
  expense_id uuid references public.expenses(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete cascade,
  amount numeric(10, 2) not null check (amount >= 0),
  created_at timestamp with time zone default now(),
  constraint expense_splits_unique unique (expense_id, profile_id)
);

-- Create Settlements Table
create table if not exists public.settlements (
  id uuid default gen_random_uuid() primary key,
  group_id uuid references public.groups(id) on delete cascade,
  payer_id uuid references public.profiles(id) on delete cascade,
  payee_id uuid references public.profiles(id) on delete cascade,
  amount numeric(10, 2) not null check (amount > 0),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamp with time zone default now()
);

-- Create Activities Table
create table if not exists public.activities (
  id uuid default gen_random_uuid() primary key,
  group_id uuid references public.groups(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete cascade,
  action_type text not null, -- 'expense_created', 'expense_updated', 'expense_deleted', 'settlement_created', 'member_joined', 'member_removed'
  metadata jsonb default '{}'::jsonb,
  created_at timestamp with time zone default now()
);

-- 2. Trigger Helper & Profile Creation Functions

create or replace function public.is_group_member(group_id uuid, user_id uuid)
returns boolean as $$
begin
  return exists (
    select 1 from public.group_members
    where group_members.group_id = is_group_member.group_id
      and group_members.profile_id = is_group_member.user_id
  );
end;
$$ language plpgsql security definer;

create or replace function public.generate_unique_expense_id()
returns text as $$
declare
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- Exclude 0, 1, I, O to prevent visual confusion
  new_id text;
  exists_id bool;
  i integer;
begin
  loop
    new_id := 'SPL-';
    for i in 1..6 loop
      new_id := new_id || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    end loop;
    
    select exists(select 1 from public.profiles where expense_id = new_id) into exists_id;
    if not exists_id then
      return new_id;
    end if;
  end loop;
end;
$$ language plpgsql security definer;

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, email, expense_id)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    public.generate_unique_expense_id()
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger on auth.users
create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 3. Row Level Security (RLS) Setup

-- Enable RLS on all tables
alter table public.profiles enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.expenses enable row level security;
alter table public.expense_splits enable row level security;
alter table public.settlements enable row level security;
alter table public.activities enable row level security;

-- Profiles Policies
create policy "Allow public read of profiles"
  on public.profiles for select
  to authenticated
  using (true);

create policy "Allow users to update own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id);

create policy "Allow users to insert own profile"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

-- Groups Policies
create policy "Allow group members to read groups"
  on public.groups for select
  to authenticated
  using (
    created_by = auth.uid() or
    public.is_group_member(id, auth.uid())
  );

create policy "Allow authenticated users to create groups"
  on public.groups for insert
  to authenticated
  with check (true);

create policy "Allow group members to update groups"
  on public.groups for update
  to authenticated
  using (
    created_by = auth.uid() or
    public.is_group_member(id, auth.uid())
  );

create policy "Allow group creators to delete groups"
  on public.groups for delete
  to authenticated
  using (auth.uid() = created_by);

-- Group Members Policies
create policy "Allow members to view group member map"
  on public.group_members for select
  to authenticated
  using (
    public.is_group_member(group_id, auth.uid())
  );

create policy "Allow members to add other members"
  on public.group_members for insert
  to authenticated
  with check (
    -- Allow initial creator to add themselves during group creation
    profile_id = auth.uid() or
    public.is_group_member(group_id, auth.uid())
  );

create policy "Allow members to leave or creator to remove members"
  on public.group_members for delete
  to authenticated
  using (
    profile_id = auth.uid() or
    exists (
      select 1 from public.groups g
      where g.id = group_members.group_id and g.created_by = auth.uid()
    )
  );

-- Expenses Policies
create policy "Allow members to select expenses"
  on public.expenses for select
  to authenticated
  using (
    exists (
      select 1 from public.group_members
      where group_members.group_id = expenses.group_id and group_members.profile_id = auth.uid()
    )
  );

create policy "Allow members to insert expenses"
  on public.expenses for insert
  to authenticated
  with check (
    exists (
      select 1 from public.group_members
      where group_members.group_id = expenses.group_id and group_members.profile_id = auth.uid()
    )
  );

create policy "Allow members to update expenses"
  on public.expenses for update
  to authenticated
  using (
    exists (
      select 1 from public.group_members
      where group_members.group_id = expenses.group_id and group_members.profile_id = auth.uid()
    )
  );

create policy "Allow members to delete expenses"
  on public.expenses for delete
  to authenticated
  using (
    exists (
      select 1 from public.group_members
      where group_members.group_id = expenses.group_id and group_members.profile_id = auth.uid()
    )
  );

-- Splits Policies
create policy "Allow members to select splits"
  on public.expense_splits for select
  to authenticated
  using (
    exists (
      select 1 from public.expenses e
      join public.group_members gm on gm.group_id = e.group_id
      where e.id = expense_splits.expense_id and gm.profile_id = auth.uid()
    )
  );

create policy "Allow members to insert splits"
  on public.expense_splits for insert
  to authenticated
  with check (
    exists (
      select 1 from public.expenses e
      join public.group_members gm on gm.group_id = e.group_id
      where e.id = expense_splits.expense_id and gm.profile_id = auth.uid()
    )
  );

create policy "Allow members to update splits"
  on public.expense_splits for update
  to authenticated
  using (
    exists (
      select 1 from public.expenses e
      join public.group_members gm on gm.group_id = e.group_id
      where e.id = expense_splits.expense_id and gm.profile_id = auth.uid()
    )
  );

create policy "Allow members to delete splits"
  on public.expense_splits for delete
  to authenticated
  using (
    exists (
      select 1 from public.expenses e
      join public.group_members gm on gm.group_id = e.group_id
      where e.id = expense_splits.expense_id and gm.profile_id = auth.uid()
    )
  );

-- Settlements Policies
create policy "Allow group members to read settlements"
  on public.settlements for select
  to authenticated
  using (
    exists (
      select 1 from public.group_members
      where group_members.group_id = settlements.group_id and group_members.profile_id = auth.uid()
    )
  );

create policy "Allow group members to insert settlements"
  on public.settlements for insert
  to authenticated
  with check (
    exists (
      select 1 from public.group_members
      where group_members.group_id = settlements.group_id and group_members.profile_id = auth.uid()
    )
  );

-- Activities Policies
create policy "Allow group members to read activities"
  on public.activities for select
  to authenticated
  using (
    exists (
      select 1 from public.group_members
      where group_members.group_id = activities.group_id and group_members.profile_id = auth.uid()
    )
  );

-- 4. Activity Logging Triggers

-- Trigger for logging expense creation/updates
create or replace function public.log_expense_activity()
returns trigger as $$
begin
  if (TG_OP = 'INSERT') then
    insert into public.activities (group_id, profile_id, action_type, metadata)
    values (
      new.group_id,
      new.created_by,
      'expense_created',
      jsonb_build_object('expense_title', new.title, 'amount', new.amount)
    );
  elsif (TG_OP = 'UPDATE') then
    insert into public.activities (group_id, profile_id, action_type, metadata)
    values (
      new.group_id,
      new.paid_by,
      'expense_updated',
      jsonb_build_object('expense_title', new.title, 'amount', new.amount)
    );
  end if;
  return new;
end;
$$ language plpgsql security definer;

-- Trigger for logging expense deletion
create or replace function public.log_expense_deletion_activity()
returns trigger as $$
begin
  insert into public.activities (group_id, profile_id, action_type, metadata)
  values (
    old.group_id,
    auth.uid(),
    'expense_deleted',
    jsonb_build_object('expense_title', old.title, 'amount', old.amount)
  );
  return old;
end;
$$ language plpgsql security definer;

-- Trigger for logging settlement creation
create or replace function public.log_settlement_activity()
returns trigger as $$
declare
  payer_name text;
  payee_name text;
begin
  select name into payer_name from public.profiles where id = new.payer_id;
  select name into payee_name from public.profiles where id = new.payee_id;
  
  insert into public.activities (group_id, profile_id, action_type, metadata)
  values (
    new.group_id,
    new.created_by,
    'settlement_created',
    jsonb_build_object(
      'payer_name', payer_name,
      'payee_name', payee_name,
      'amount', new.amount
    )
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger for logging group membership changes
create or replace function public.log_group_membership_activity()
returns trigger as $$
declare
  member_name text;
begin
  if (TG_OP = 'INSERT') then
    select name into member_name from public.profiles where id = new.profile_id;
    insert into public.activities (group_id, profile_id, action_type, metadata)
    values (
      new.group_id,
      new.profile_id,
      'member_joined',
      jsonb_build_object('member_name', member_name)
    );
  elsif (TG_OP = 'DELETE') then
    select name into member_name from public.profiles where id = old.profile_id;
    insert into public.activities (group_id, profile_id, action_type, metadata)
    values (
      old.group_id,
      auth.uid(),
      'member_removed',
      jsonb_build_object('member_name', member_name)
    );
  end if;
  return null;
end;
$$ language plpgsql security definer;

-- Trigger Assignments
create or replace trigger on_expense_changes
  after insert or update on public.expenses
  for each row execute procedure public.log_expense_activity();

create or replace trigger on_expense_deleted
  after delete on public.expenses
  for each row execute procedure public.log_expense_deletion_activity();

create or replace trigger on_settlement_created
  after insert on public.settlements
  for each row execute procedure public.log_settlement_activity();

create or replace trigger on_membership_changes
  after insert or delete on public.group_members
  for each row execute procedure public.log_group_membership_activity();
