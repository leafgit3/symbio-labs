create table if not exists public.simulation_sessions (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  started_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists simulation_sessions_started_at_idx
  on public.simulation_sessions (started_at desc);

insert into public.simulation_sessions (id, label, started_at, created_at)
values (
  '00000000-0000-4000-8000-000000000001',
  'legacy',
  timezone('utc', now()),
  timezone('utc', now())
)
on conflict (id) do nothing;

alter table public.simulation_config
  add column if not exists active_session_id uuid;

insert into public.simulation_config (id, world_brief, active_session_id, updated_at)
values (
  'default',
  'The citadel is a tiny digital polity testing how coordination, rumor, and skepticism shape trust over repeated cycles.',
  '00000000-0000-4000-8000-000000000001',
  timezone('utc', now())
)
on conflict (id) do nothing;

update public.simulation_config
set active_session_id = '00000000-0000-4000-8000-000000000001'
where active_session_id is null;

alter table public.simulation_config
  drop constraint if exists simulation_config_active_session_id_fkey;

alter table public.simulation_config
  add constraint simulation_config_active_session_id_fkey
  foreign key (active_session_id) references public.simulation_sessions(id) on delete restrict;

alter table public.simulation_config
  alter column active_session_id set not null;

alter table public.world_state
  add column if not exists session_id uuid;

alter table public.cycle_runs
  add column if not exists session_id uuid;

alter table public.feed_posts
  add column if not exists session_id uuid;

alter table public.event_logs
  add column if not exists session_id uuid;

alter table public.agent_memories
  add column if not exists session_id uuid;

alter table public.cycle_run_summaries
  add column if not exists session_id uuid;

update public.world_state
set session_id = '00000000-0000-4000-8000-000000000001'
where session_id is null;

update public.cycle_runs
set session_id = '00000000-0000-4000-8000-000000000001'
where session_id is null;

update public.feed_posts
set session_id = '00000000-0000-4000-8000-000000000001'
where session_id is null;

update public.event_logs
set session_id = '00000000-0000-4000-8000-000000000001'
where session_id is null;

update public.agent_memories
set session_id = '00000000-0000-4000-8000-000000000001'
where session_id is null;

update public.cycle_run_summaries
set session_id = '00000000-0000-4000-8000-000000000001'
where session_id is null;

alter table public.world_state
  drop constraint if exists world_state_session_id_fkey;
alter table public.world_state
  add constraint world_state_session_id_fkey
  foreign key (session_id) references public.simulation_sessions(id) on delete cascade;
alter table public.world_state
  alter column session_id set not null;

alter table public.cycle_runs
  drop constraint if exists cycle_runs_session_id_fkey;
alter table public.cycle_runs
  add constraint cycle_runs_session_id_fkey
  foreign key (session_id) references public.simulation_sessions(id) on delete cascade;
alter table public.cycle_runs
  alter column session_id set not null;

alter table public.feed_posts
  drop constraint if exists feed_posts_session_id_fkey;
alter table public.feed_posts
  add constraint feed_posts_session_id_fkey
  foreign key (session_id) references public.simulation_sessions(id) on delete cascade;
alter table public.feed_posts
  alter column session_id set not null;

alter table public.event_logs
  drop constraint if exists event_logs_session_id_fkey;
alter table public.event_logs
  add constraint event_logs_session_id_fkey
  foreign key (session_id) references public.simulation_sessions(id) on delete cascade;
alter table public.event_logs
  alter column session_id set not null;

alter table public.agent_memories
  drop constraint if exists agent_memories_session_id_fkey;
alter table public.agent_memories
  add constraint agent_memories_session_id_fkey
  foreign key (session_id) references public.simulation_sessions(id) on delete cascade;
alter table public.agent_memories
  alter column session_id set not null;

alter table public.cycle_run_summaries
  drop constraint if exists cycle_run_summaries_session_id_fkey;
alter table public.cycle_run_summaries
  add constraint cycle_run_summaries_session_id_fkey
  foreign key (session_id) references public.simulation_sessions(id) on delete cascade;
alter table public.cycle_run_summaries
  alter column session_id set not null;

alter table public.cycle_run_summaries
  drop constraint if exists cycle_run_summaries_cycle_number_key;

drop index if exists public.world_state_cycle_number_idx;
drop index if exists public.cycle_runs_cycle_number_idx;

create unique index if not exists world_state_session_cycle_number_idx
  on public.world_state (session_id, cycle_number);

create unique index if not exists cycle_runs_session_cycle_number_idx
  on public.cycle_runs (session_id, cycle_number);

create unique index if not exists cycle_run_summaries_session_cycle_number_idx
  on public.cycle_run_summaries (session_id, cycle_number);

create index if not exists cycle_run_summaries_session_cycle_idx
  on public.cycle_run_summaries (session_id, cycle_number desc);

create index if not exists feed_posts_session_created_idx
  on public.feed_posts (session_id, created_at desc);

create index if not exists feed_posts_session_cycle_created_idx
  on public.feed_posts (session_id, cycle_number, created_at);

create index if not exists event_logs_session_created_idx
  on public.event_logs (session_id, created_at desc);

create index if not exists event_logs_session_cycle_created_idx
  on public.event_logs (session_id, cycle_number, created_at);

create index if not exists agent_memories_session_created_idx
  on public.agent_memories (session_id, created_at desc);

create index if not exists agent_memories_session_agent_created_idx
  on public.agent_memories (session_id, agent_id, created_at desc);
