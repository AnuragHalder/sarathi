-- Sarathi v3.9: reflective exercises (letters, Lay it at Krishna's feet).
-- Run once in Supabase → SQL Editor (safe to run again). Also included at the end of schema.sql.
-- Only signed-in people's exercises are saved; guests' exercises are never stored.

create table if not exists public.reflections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('unsent', 'forgiveness', 'younger', 'regret', 'feet')),
  to_name text,                    -- who the letter is to ("Papa", "my younger self")
  body text,                       -- the letter itself; null once released into the fire
  items jsonb,                     -- Lay it at Krishna's feet: { inHands: [], notInHands: [], chosen }
  sealed boolean not null default false,   -- sealed letters are never read by the AI
  response jsonb,                  -- Sarathi's reflection: { reflection, verse, step }
  released boolean not null default false, -- the words were let go (deleted); only the lesson remains
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists reflections_user on public.reflections (user_id, created_at desc);

alter table public.reflections enable row level security;
drop policy if exists "own reflections" on public.reflections;
create policy "own reflections" on public.reflections
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop trigger if exists reflections_touch on public.reflections;
create trigger reflections_touch before update on public.reflections for each row execute function public.touch_updated_at();
