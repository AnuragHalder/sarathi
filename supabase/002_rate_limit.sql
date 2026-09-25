-- Sarathi: server-side usage limits. Run once in Supabase → SQL Editor (safe to re-run).
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
