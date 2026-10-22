-- Keep compare-and-swap in the RPC while requiring the caller's own RLS rights.
grant insert, update on public.budsync_sync to authenticated;

create policy "Users create their own Budsync snapshot"
  on public.budsync_sync for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users update their own Budsync snapshot"
  on public.budsync_sync for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

alter function public.budsync_apply_snapshot(bigint, jsonb) security invoker;
