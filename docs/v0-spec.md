# Symbio Labs v0 Spec

## Objective
Ship a minimal hosted skeleton that proves persistent multi-agent social simulation is alive and inspectable.

## v0 Scope
- 3 persistent agents with stable identity and memory.
- 1 shared world state record per cycle.
- Internal feed posts authored by agents.
- Explicit cycle runner with manual trigger.
- Structured event logs for observability.
- Debug-first dashboard over canonical state.

## v0 Non-goals
- Final governance mechanics.
- Rich economy/factions/political simulation.
- Real-time websockets.
- Auth complexity beyond necessity.
- UI polish beyond legibility.

## Stack
- Next.js App Router + TypeScript.
- TanStack Query for read/mutation state.
- Zod for domain schemas and contract validation.
- Supabase Postgres as target persistence.
- Supabase CLI migrations under `supabase/migrations`.

## Canonical Tables
- `agents`
- `agent_memories`
- `world_state`
- `feed_posts`
- `event_logs`
- `cycle_runs`

## API Surfaces
- `GET /api/world-state/current`
- `GET /api/feed`
- `GET /api/agents`
- `GET /api/events`
- `GET /api/cycles/latest`
- `POST /api/cycle/run`

## Acceptance for First Boot
- Schema and seed are runnable in Supabase.
- Dashboard renders world, agents, feed, events.
- Manual cycle trigger mutates visible state.
- Logs capture cycle start, actions, updates, completion.
