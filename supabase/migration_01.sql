-- SplitFlow Schema Upgrade Migration (migration_01.sql)
-- Run this in the Supabase SQL editor to upgrade your database schema.

-- 1. Add new columns to expenses
alter table public.expenses 
  add column if not exists notes text,
  add column if not exists split_type text default 'equal';

-- 2. Create Settlements Table
create table if not exists public.settlements (
  id uuid default gen_random_uuid() primary key,
  group_id uuid references public.groups(id) on delete cascade,
  payer_id uuid references public.profiles(id) on delete cascade,
  payee_id uuid references public.profiles(id) on delete cascade,
  amount numeric(10, 2) not null check (amount > 0),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamp with time zone default now()
);

-- 3. Create Activities Table
create table if not exists public.activities (
  id uuid default gen_random_uuid() primary key,
  group_id uuid references public.groups(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete cascade,
  action_type text not null,
  metadata jsonb default '{}'::jsonb,
  created_at timestamp with time zone default now()
);

-- 4. Enable RLS on new tables
alter table public.settlements enable row level security;
alter table public.activities enable row level security;

-- 5. RLS Policies for new tables
drop policy if exists "Allow group members to read settlements" on public.settlements;
create policy "Allow group members to read settlements"
  on public.settlements for select
  to authenticated
  using (
    exists (
      select 1 from public.group_members
      where group_members.group_id = settlements.group_id and group_members.profile_id = auth.uid()
    )
  );

drop policy if exists "Allow group members to insert settlements" on public.settlements;
create policy "Allow group members to insert settlements"
  on public.settlements for insert
  to authenticated
  with check (
    exists (
      select 1 from public.group_members
      where group_members.group_id = settlements.group_id and group_members.profile_id = auth.uid()
    )
  );

drop policy if exists "Allow group members to read activities" on public.activities;
create policy "Allow group members to read activities"
  on public.activities for select
  to authenticated
  using (
    exists (
      select 1 from public.group_members
      where group_members.group_id = activities.group_id and group_members.profile_id = auth.uid()
    )
  );

-- Allow deletion of groups by creator
drop policy if exists "Allow group creators to delete groups" on public.groups;
create policy "Allow group creators to delete groups"
  on public.groups for delete
  to authenticated
  using (auth.uid() = created_by);

-- 6. Update Expense ID generator function to use SPL- prefix
create or replace function public.generate_unique_expense_id()
returns text as $$
declare
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
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

-- 7. Add automated activity logging trigger functions and assignments
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

-- Trigger creation assignments (Drop first to avoid duplication errors)
drop trigger if exists on_expense_changes on public.expenses;
create trigger on_expense_changes
  after insert or update on public.expenses
  for each row execute procedure public.log_expense_activity();

drop trigger if exists on_expense_deleted on public.expenses;
create trigger on_expense_deleted
  after delete on public.expenses
  for each row execute procedure public.log_expense_deletion_activity();

drop trigger if exists on_settlement_created on public.settlements;
create trigger on_settlement_created
  after insert on public.settlements
  for each row execute procedure public.log_settlement_activity();

drop trigger if exists on_membership_changes on public.group_members;
create trigger on_membership_changes
  after insert or delete on public.group_members
  for each row execute procedure public.log_group_membership_activity();

-- 8. Add RLS insert policy for profiles to support client fallback insertions
drop policy if exists "Allow users to insert own profile" on public.profiles;
create policy "Allow users to insert own profile"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

-- 9. Add RLS select/update policies to allow creator read/write before membership row is inserted
drop policy if exists "Allow group members to read groups" on public.groups;
create policy "Allow group members to read groups"
  on public.groups for select
  to authenticated
  using (
    created_by = auth.uid() or
    public.is_group_member(id, auth.uid())
  );

drop policy if exists "Allow group members to update groups" on public.groups;
create policy "Allow group members to update groups"
  on public.groups for update
  to authenticated
  using (
    created_by = auth.uid() or
    public.is_group_member(id, auth.uid())
  );

-- 10. Fix groups INSERT RLS and default created_by value
ALTER TABLE public.groups ALTER COLUMN created_by SET DEFAULT auth.uid();

DROP POLICY IF EXISTS "Allow authenticated users to create groups" ON public.groups;
CREATE POLICY "Allow authenticated users to create groups"
  ON public.groups FOR INSERT
  TO authenticated
  WITH CHECK (true);

