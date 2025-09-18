-- Supabase schema export for neuralitica-bot
-- Generated on 2025-09-17

-- Extensions (installed ones with versions shown; create only where needed)
create extension if not exists "pgcrypto" with schema extensions;
create extension if not exists "uuid-ossp" with schema extensions;
create extension if not exists "pg_graphql" with schema graphql;
create extension if not exists "supabase_vault" with schema vault;

-- Schemas (ensure exist)
create schema if not exists public;
create schema if not exists auth;

set search_path = public, extensions, graphql, vault, auth;

-- Tables
create table if not exists public.user_profiles (
  id uuid primary key,
  email text not null,
  full_name text,
  role text default 'USER' check (role = any (array['ADMIN','USER']::text[])),
  is_active boolean default true,
  created_at timestamptz default now(),
  subscription_expires_at timestamptz,
  unique(email)
);

create table if not exists public.price_lists (
  id uuid primary key default gen_random_uuid(),
  is_active boolean default false,
  uploaded_by uuid references auth.users(id) on update cascade on delete restrict,
  file_name text not null,
  supplier_name text,
  storage_path text not null,
  openai_file_id text unique,
  openai_vector_file_id text,
  uploaded_at timestamptz default now()
);

create table if not exists public.conversations (
  user_id uuid references auth.users(id) on update cascade on delete cascade,
  title text,
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now()
);

create table if not exists public.messages (
  conversation_id uuid references public.conversations(id) on update cascade on delete restrict,
  user_id uuid references auth.users(id) on update cascade on delete cascade,
  content text not null,
  role text check (role = any (array['user','assistant']::text[])),
  id uuid primary key default gen_random_uuid(),
  tokens_used integer default 0,
  response_time_ms integer default 0,
  created_at timestamptz default now()
);

create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on update cascade on delete restrict,
  created_at timestamptz default now()
);

-- Indexes
create index if not exists idx_user_profiles_is_active on public.user_profiles(is_active);
create index if not exists idx_user_profiles_role on public.user_profiles(role);
create index if not exists idx_user_profiles_license_expires on public.user_profiles(subscription_expires_at);

create index if not exists idx_price_lists_active on public.price_lists(is_active);
create index if not exists idx_price_lists_uploaded_by on public.price_lists(uploaded_by);

create index if not exists idx_conversations_user_id on public.conversations(user_id);

create index if not exists idx_messages_conversation_id on public.messages(conversation_id);
create index if not exists idx_messages_user_id on public.messages(user_id);

-- Functions
create or replace function public.get_active_vector_store_ids()
returns text[]
language plpgsql
security definer
as $$
  begin
    return array(
      select openai_vector_file_id
      from public.price_lists
      where is_active = true and openai_vector_file_id is not null
    );
  end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.user_profiles (id, email, full_name, role, is_active)
  values (
    NEW.id,
    NEW.email,
    coalesce(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    'USER',
    true
  );
  return NEW;
end;
$$;

-- Trigger on auth.users
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- RLS policies and enabling RLS
alter table public.user_profiles enable row level security;
alter table public.price_lists enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.admins enable row level security;

-- user_profiles policies
drop policy if exists user_profiles_select_all_admins on public.user_profiles;
create policy user_profiles_select_all_admins on public.user_profiles
  for select to public using (
    exists (select 1 from public.user_profiles up where up.id = auth.uid() and up.role = 'ADMIN')
    or exists (select 1 from public.admins a where a.user_id = auth.uid())
  );

drop policy if exists user_profiles_select_self on public.user_profiles;
create policy user_profiles_select_self on public.user_profiles
  for select to public using (auth.uid() = id);

drop policy if exists user_profiles_update_self on public.user_profiles;
create policy user_profiles_update_self on public.user_profiles
  for update to public using (auth.uid() = id);

-- price_lists policies
drop policy if exists price_lists_admin_access on public.price_lists;
create policy price_lists_admin_access on public.price_lists
  for all to public using (
    exists (select 1 from public.user_profiles up where up.id = auth.uid() and up.role = 'ADMIN')
    or exists (select 1 from public.admins a where a.user_id = auth.uid())
  );

drop policy if exists price_lists_read_all on public.price_lists;
create policy price_lists_read_all on public.price_lists
  for select to public using (auth.role() = 'authenticated');

-- conversations policies
drop policy if exists conversations_admin_access on public.conversations;
create policy conversations_admin_access on public.conversations
  for select to public using (
    exists (select 1 from public.user_profiles up where up.id = auth.uid() and up.role = 'ADMIN')
    or exists (select 1 from public.admins a where a.user_id = auth.uid())
  );

drop policy if exists conversations_user_access on public.conversations;
create policy conversations_user_access on public.conversations
  for all to public using (auth.uid() = user_id);

-- messages policies
drop policy if exists messages_admin_access on public.messages;
create policy messages_admin_access on public.messages
  for select to public using (
    exists (select 1 from public.user_profiles up where up.id = auth.uid() and up.role = 'ADMIN')
    or exists (select 1 from public.admins a where a.user_id = auth.uid())
  );

drop policy if exists messages_user_access on public.messages;
create policy messages_user_access on public.messages
  for all to public using (auth.uid() = user_id);

-- admins policies
drop policy if exists admins_select_self on public.admins;
create policy admins_select_self on public.admins
  for select to public using (auth.uid() = user_id);

-- Notes:
-- - This schema assumes extensions schemas exist (extensions/graphql/vault) as on Supabase.
-- - It references auth.users. In a fresh Supabase project, auth schema is provisioned automatically.
-- - Review ON DELETE actions to ensure they match your desired behavior.


