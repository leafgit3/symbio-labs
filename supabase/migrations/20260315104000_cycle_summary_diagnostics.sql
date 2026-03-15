alter table public.cycle_run_summaries
  add column if not exists diagnostics jsonb;

update public.cycle_run_summaries
set diagnostics = '{}'::jsonb
where diagnostics is null;
