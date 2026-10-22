-- V3 sync is isolated from the project's existing wallets and transactions tables.
create table if not exists public.budsync_sync (
  user_id uuid primary key references auth.users(id) on delete cascade,
  revision bigint not null default 0 check (revision >= 0),
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.budsync_sync enable row level security;
revoke all on public.budsync_sync from anon, authenticated;
grant select on public.budsync_sync to authenticated;

create policy "Users read their own Budsync snapshot"
  on public.budsync_sync for select to authenticated
  using ((select auth.uid()) = user_id);

create or replace function public.budsync_apply_snapshot(expected_revision bigint, next_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner_id uuid := auth.uid();
  current_row public.budsync_sync%rowtype;
begin
  if owner_id is null then
    raise exception 'Sign in before syncing' using errcode = '28000';
  end if;
  if expected_revision is null or expected_revision < 0
    or next_payload is null or jsonb_typeof(next_payload) <> 'object'
    or next_payload->>'version' <> '2'
    or jsonb_typeof(next_payload->'wallets') <> 'array'
    or jsonb_typeof(next_payload->'entries') <> 'array'
    or pg_catalog.octet_length(next_payload::text) > 5242880 then
    raise exception 'Invalid Budsync snapshot' using errcode = '22023';
  end if;

  insert into public.budsync_sync (user_id) values (owner_id)
    on conflict (user_id) do nothing;
  select * into current_row from public.budsync_sync
    where user_id = owner_id for update;
  if current_row.revision <> expected_revision then
    return jsonb_build_object('applied', false, 'revision', current_row.revision,
      'payload', current_row.payload);
  end if;

  update public.budsync_sync
    set revision = revision + 1, payload = next_payload, updated_at = now()
    where user_id = owner_id
    returning * into current_row;
  return jsonb_build_object('applied', true, 'revision', current_row.revision,
    'payload', current_row.payload);
end;
$$;

revoke all on function public.budsync_apply_snapshot(bigint, jsonb) from public, anon;
grant execute on function public.budsync_apply_snapshot(bigint, jsonb) to authenticated;
