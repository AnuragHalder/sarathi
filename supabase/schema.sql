-- Sarathi database setup.
-- Paste this whole file into Supabase → SQL Editor → New query → Run. Safe to run more than once.

-- ---------------------------------------------------------------------------
-- Profiles: one row per Google account (created automatically on first sign-in)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text,
  avatar_url text,
  default_style text not null default 'verse' check (default_style in ('verse', 'arjuna', 'direct')),
  memory_enabled boolean not null default true,
  consented_at timestamptz,          -- privacy notice + 18+ accepted
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Conversations: each chat session
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null default 'New conversation',
  style text not null default 'verse',
  summary text,                      -- one-line summary written at memory checkpoints
  user_turns int not null default 0, -- number of user messages (drives checkpoints)
  last_checkpoint_turn int not null default 0,
  private boolean not null default false, -- private chats are never used for memory
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists conversations_user_updated on public.conversations (user_id, updated_at desc);

-- Messages
create table if not exists public.messages (
  id bigint generated always as identity primary key,
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  style text,
  crisis boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists messages_conversation on public.messages (conversation_id, id);

-- Memories: short notes Sarathi keeps about the user, across all chats
create table if not exists public.memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null check (type in ('context', 'situation', 'pattern', 'goal', 'helped', 'preference')),
  content text not null,
  importance smallint not null default 3 check (importance between 1 and 5),
  status text not null default 'active' check (status in ('active', 'resolved')),
  sensitive boolean not null default false,
  source_conversation_id uuid references public.conversations (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists memories_user on public.memories (user_id, status, importance desc, updated_at desc);

-- ---------------------------------------------------------------------------
-- Row-level security: every user can only ever see and change their own rows.
alter table public.profiles enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.memories enable row level security;

drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "own conversations" on public.conversations;
create policy "own conversations" on public.conversations
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own messages" on public.messages;
create policy "own messages" on public.messages
  for all using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (select 1 from public.conversations c where c.id = conversation_id and c.user_id = auth.uid())
  );

drop policy if exists "own memories" on public.memories;
create policy "own memories" on public.memories
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Create the profile row automatically when someone signs in for the first time.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep updated_at fresh.
create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();
drop trigger if exists memories_touch on public.memories;
create trigger memories_touch before update on public.memories for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- "Delete my account": removes the login and, through the cascades above, every chat,
-- message, memory and the profile. Callable only by the signed-in user, for themselves.
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- ---------------------------------------------------------------------------
-- Usage limits (same as supabase/002_rate_limit.sql)
create table if not exists public.rate_events (
  id bigint generated always as identity primary key,
  key text not null,
  created_at timestamptz not null default now()
);
create index if not exists rate_events_key_time on public.rate_events (key, created_at desc);
alter table public.rate_events enable row level security; -- no policies: only the function below can touch it

-- Records one request for `p_key` and returns true if it is within `p_limit` per `p_window_seconds`.
-- Signed-in callers are always counted under their own user id, whatever key they pass.
create or replace function public.check_rate_limit(p_key text, p_limit int, p_window_seconds int)
returns boolean
language plpgsql
security definer set search_path = ''
as $$
declare
  k text := case when auth.uid() is not null then 'u:' || auth.uid()::text else left(p_key, 100) end;
  n int;
begin
  if auth.uid() is null and k not like 'ip:%' then
    return false;
  end if;
  select count(*) into n from public.rate_events
   where key = k and created_at > now() - make_interval(secs => p_window_seconds);
  if n >= p_limit then
    return false;
  end if;
  insert into public.rate_events (key) values (k);
  -- occasional cleanup of old rows
  if random() < 0.01 then
    delete from public.rate_events where created_at < now() - interval '2 days';
  end if;
  return true;
end;
$$;
revoke all on function public.check_rate_limit(text, int, int) from public;
grant execute on function public.check_rate_limit(text, int, int) to anon, authenticated;
