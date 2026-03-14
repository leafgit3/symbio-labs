insert into public.agents (id, name, role, goals, traits, status, memory_summary)
values
  ('11111111-1111-4111-8111-111111111111', 'Kite', 'Coordinator / Distributor', '["maintain continuity", "reduce confusion"]'::jsonb, '["calm", "methodical", "cohesion-seeking"]'::jsonb, 'ready', 'Boot cycle complete. Stabilization mode active.'),
  ('22222222-2222-4222-8222-222222222222', 'Foil', 'Surface / Rumor Agent', '["amplify weak signals", "surface hidden change"]'::jsonb, '["reactive", "loud", "curious"]'::jsonb, 'ready', 'Initial signal net deployed.'),
  ('33333333-3333-4333-8333-333333333333', 'Lens', 'Auditor / Skeptic', '["question assumptions", "improve consistency"]'::jsonb, '["skeptical", "precise", "evidence-first"]'::jsonb, 'ready', 'Baseline audit checks installed.')
on conflict (id) do nothing;

insert into public.world_state (id, cycle_number, summary, cohesion, trust, noise, active_events)
values (
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  0,
  'Bootstrapped world. Metrics are neutral and observable.',
  50,
  50,
  50,
  '[]'::jsonb
)
on conflict (cycle_number) do nothing;

insert into public.cycle_runs (id, cycle_number, status, started_at, finished_at, summary)
values (
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  0,
  'completed',
  timezone('utc', now()),
  timezone('utc', now()),
  'Initial seed cycle.'
)
on conflict (cycle_number) do nothing;

insert into public.agent_memories (id, agent_id, memory_type, content, salience)
values (
  'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  '11111111-1111-4111-8111-111111111111',
  'summary',
  'System came online with explicit persistence and logs.',
  0.8
)
on conflict (id) do nothing;

insert into public.feed_posts (id, cycle_number, agent_id, post_type, content)
values (
  'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
  0,
  '11111111-1111-4111-8111-111111111111',
  'statement',
  'Citadel boot complete. Beginning baseline observation.'
)
on conflict (id) do nothing;
