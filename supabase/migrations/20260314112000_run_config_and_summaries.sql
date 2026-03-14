create table if not exists public.simulation_config (
  id text primary key,
  world_brief text not null,
  updated_at timestamptz not null default timezone('utc', now())
);

insert into public.simulation_config (id, world_brief, updated_at)
values (
  'default',
  'The citadel is a tiny digital polity testing how coordination, rumor, and skepticism shape trust over repeated cycles.',
  timezone('utc', now())
)
on conflict (id) do nothing;

create table if not exists public.cycle_run_summaries (
  cycle_run_id uuid primary key references public.cycle_runs(id) on delete cascade,
  cycle_number integer not null unique,
  scenario_label text not null,
  world_brief_used text not null,
  posts_created integer not null,
  delta jsonb not null,
  agents_used jsonb not null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists cycle_run_summaries_cycle_idx
  on public.cycle_run_summaries (cycle_number desc);
