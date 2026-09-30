-- Sarathi v3.7: next-morning check-in emails.
-- Run once in Supabase → SQL Editor (safe to run again). Also included at the end of schema.sql.

-- Each person chooses whether Sarathi may email them a check-in.
alter table public.profiles add column if not exists checkins_enabled boolean not null default false;
alter table public.profiles add column if not exists checkins_declined_at timestamptz;  -- "No thanks": don't ask again for a while

-- One scheduled check-in per conversation (the latest practice in it).
create table if not exists public.checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  conversation_id uuid not null unique references public.conversations (id) on delete cascade,
  practice text not null,
  verse text,                                   -- e.g. '2.47', the verse cited with the practice
  due_on date not null,                         -- India date the email goes out (the morning after)
  status text not null default 'scheduled' check (status in ('scheduled', 'sent', 'skipped', 'cancelled')),
  answer text check (answer in ('helped', 'hard', 'not_yet')),
  answered_at timestamptz,
  sent_at timestamptz,
  note text,                                    -- why it was skipped, or the send error
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists checkins_due on public.checkins (status, due_on);

alter table public.checkins enable row level security;
drop policy if exists "own checkins" on public.checkins;
create policy "own checkins" on public.checkins
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop trigger if exists checkins_touch on public.checkins;
create trigger checkins_touch before update on public.checkins for each row execute function public.touch_updated_at();

-- The morning job's list: due check-ins with the person's email and first name.
-- Only the server's secret key (service_role) may call it; emails never reach the browser.
create or replace function public.due_checkins(p_today date, p_limit int default 100)
returns table (id uuid, user_id uuid, conversation_id uuid, practice text, verse text, due_on date, email text, name text)
language sql
security definer set search_path = ''
as $$
  select c.id, c.user_id, c.conversation_id, c.practice, c.verse, c.due_on, u.email::text, p.name
  from public.checkins c
  join public.profiles p on p.id = c.user_id
  join auth.users u on u.id = c.user_id
  where c.status = 'scheduled' and c.due_on <= p_today and p.checkins_enabled and u.email is not null
  order by c.due_on, c.created_at
  limit p_limit;
$$;
revoke all on function public.due_checkins(date, int) from public, anon, authenticated;
grant execute on function public.due_checkins(date, int) to service_role;

-- The same details for one person's latest check-in (the "send me a test now" button).
create or replace function public.checkin_for_user(p_user uuid)
returns table (id uuid, user_id uuid, conversation_id uuid, practice text, verse text, due_on date, email text, name text)
language sql
security definer set search_path = ''
as $$
  select c.id, c.user_id, c.conversation_id, c.practice, c.verse, c.due_on, u.email::text, p.name
  from public.checkins c
  join public.profiles p on p.id = c.user_id
  join auth.users u on u.id = c.user_id
  where c.user_id = p_user and c.status in ('scheduled', 'sent')
  order by c.created_at desc
  limit 1;
$$;
revoke all on function public.checkin_for_user(uuid) from public, anon, authenticated;
grant execute on function public.checkin_for_user(uuid) to service_role;
