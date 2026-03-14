create extension if not exists pgcrypto;

create table if not exists public.agents (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text not null,
  goals jsonb not null default '[]'::jsonb,
  traits jsonb not null default '[]'::jsonb,
  status text not null default 'ready',
  memory_summary text not null default '',
  last_action_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.agent_memories (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agents(id) on delete cascade,
  memory_type text not null,
  content text not null,
  salience double precision not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint agent_memories_memory_type_check
    check (memory_type in ('observation', 'event_memory', 'social_memory', 'world_memory', 'self_adjustment', 'summary'))
);

create table if not exists public.world_state (
  id uuid primary key default gen_random_uuid(),
  cycle_number integer not null,
  summary text not null,
  cohesion double precision not null,
  trust double precision not null,
  noise double precision not null,
  active_events jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists world_state_cycle_number_idx
  on public.world_state (cycle_number);

create table if not exists public.feed_posts (
  id uuid primary key default gen_random_uuid(),
  cycle_number integer not null,
  agent_id uuid not null references public.agents(id) on delete cascade,
  post_type text not null,
  content text not null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint feed_posts_post_type_check
    check (post_type in ('statement', 'reaction', 'signal', 'rumor', 'support', 'audit_note'))
);

create index if not exists feed_posts_cycle_created_idx
  on public.feed_posts (cycle_number desc, created_at desc);

create table if not exists public.event_logs (
  id uuid primary key default gen_random_uuid(),
  cycle_number integer not null,
  event_type text not null,
  source_agent_id uuid references public.agents(id) on delete set null,
  summary text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  constraint event_logs_event_type_check
    check (event_type in ('cycle_started', 'agent_action', 'feed_post_created', 'memory_updated', 'world_state_changed', 'minor_event_created', 'cycle_finished'))
);

create index if not exists event_logs_cycle_created_idx
  on public.event_logs (cycle_number desc, created_at desc);

create table if not exists public.cycle_runs (
  id uuid primary key default gen_random_uuid(),
  cycle_number integer not null,
  status text not null,
  started_at timestamptz not null,
  finished_at timestamptz,
  summary text not null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint cycle_runs_status_check check (status in ('running', 'completed', 'failed'))
);

create unique index if not exists cycle_runs_cycle_number_idx
  on public.cycle_runs (cycle_number);
