# Symbio Labs

Lunar Citadel MVP scaffold for persistent multi-agent simulation.

Core stack:
- Next.js App Router + TypeScript
- TanStack Query
- Zod
- Supabase Postgres + SQL migrations

## Quickstart

```bash
npm install
npm run dev
```

Open `http://localhost:3000/dashboard`.

## Runtime Modes

- Supabase mode (default when env is present): API reads/writes persist to Supabase cloud.
- Fallback mode (no Supabase env): in-memory runtime for local prototyping.

Required env for Supabase runtime:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
```

Optional LLM env (OpenAI-compatible endpoint):

```bash
LLM_BASE_URL=https://<your-agent-endpoint>.agents.do-ai.run
LLM_API_KEY=<your-agent-key>
```

If LLM env is missing, agent actions fall back to deterministic rule logic.

## Supabase Setup

1. Link project:

```bash
supabase link --project-ref <your-project-ref>
```

2. Push migrations:

```bash
supabase db push
```

3. Seed baseline records (optional):

```bash
supabase db query < supabase/seed.sql
```

## Dashboard Workflow

`/dashboard` supports:
- world brief editing
- scenario label input
- per-run agent override JSON
- cycle execution
- live world/feed/event state
- latest run summary (scenario + deltas + post count)

Override JSON format:

```json
[
  {
    "agentId": "22222222-2222-4222-8222-222222222222",
    "traits": ["reactive", "amplifying", "impatient"],
    "goals": ["surface weak signals quickly"]
  }
]
```

## History Viewer

`/history` provides:
- cycle list
- per-cycle scenario summary
- per-cycle deltas and brief used
- agents/roles/traits used in that cycle
- feed/event/memory counts

## API Surfaces

Core:
- `GET /api/world-state/current`
- `GET /api/agents`
- `GET /api/feed`
- `GET /api/events`
- `GET /api/agent-memories`
- `GET /api/cycles/latest`
- `POST /api/cycle/run`

Scenario + history:
- `GET /api/config/world-brief`
- `POST /api/config/world-brief`
- `GET /api/cycles/run-summary/latest`
- `GET /api/cycles/history`
- `GET /api/cycles/history/:cycleNumber`
- `POST /api/testing/run-matrix`

Example matrix test:

```bash
curl -X POST http://localhost:3000/api/testing/run-matrix \\
  -H "content-type: application/json" \\
  -d '{
    "scenarios": [
      {"label":"baseline","worldBrief":"Baseline social equilibrium","cycles":2},
      {"label":"rumor-stress","worldBrief":"Rumor pressure is escalating","cycles":2}
    ]
  }'
```

## Project Structure

- `src/app/dashboard`: run control + observability
- `src/app/history`: cycle history viewer
- `src/app/api`: runtime APIs
- `src/lib/simulation`: cycle orchestration
- `src/lib/llm`: OpenAI-compatible agent turn calls
- `src/lib/db`: Supabase/runtime query helpers
- `src/lib/schemas`: shared Zod contracts
- `supabase/migrations`: schema evolution
- `supabase/seed.sql`: baseline data
- `docs/v0-spec.md`: concise scope
- `docs/loop-contract.md`: cycle contract
