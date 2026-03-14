# Symbio Labs

Lunar Citadel MVP scaffold with Next.js, TanStack Query, Zod, and Supabase migrations.

## Quickstart

```bash
npm install
npm run dev
```

Open http://localhost:3000 and go to `/dashboard`.
Use the `World Brief` card to set simulation context, then run cycles.

## Project Structure

- `src/app/dashboard`: debug-first simulation dashboard
- `src/app/api`: API routes for world/feed/agents/events/cycle
- `src/lib/schemas`: Zod domain contracts
- `src/lib/simulation`: cycle loop scaffolding
- `src/lib/llm`: OpenAI-compatible agent turn integration
- `supabase/migrations`: SQL migrations for Postgres/Supabase
- `supabase/seed.sql`: baseline seed for 3 agents + initial world
- `docs/v0-spec.md`: concise v0 scope and acceptance
- `docs/loop-contract.md`: cycle orchestration contract

## Supabase Cloud Workflow

1. Create your own Supabase project.
2. Link your local repo:

```bash
supabase link --project-ref <your-project-ref>
```

3. Push schema migrations:

```bash
supabase db push
```

4. Seed initial records (optional if using db reset locally):

```bash
supabase db query < supabase/seed.sql
```

Each teammate links to their own project; migrations stay shared in Git.

## LLM Endpoint (Optional)

Set these environment variables to enable LLM-generated agent actions:

```bash
LLM_BASE_URL=https://<your-agent-endpoint>.agents.do-ai.run
LLM_API_KEY=<your-agent-key>
```

If either variable is missing, the simulator falls back to deterministic rule-based actions.

## Scenario Testing

`POST /api/cycle/run` accepts optional per-run overrides:

```json
{
  "scenarioLabel": "high-noise stress test",
  "worldBrief": "The citadel is facing escalating misinformation pressure.",
  "agentOverrides": [
    {
      "agentId": "22222222-2222-4222-8222-222222222222",
      "traits": ["reactive", "amplifying", "impatient"]
    }
  ]
}
```

Each cycle records a structured `runSummary` (scenario label, world brief used, agent contexts, deltas, posts created) and exposes latest summary at:

- `GET /api/cycles/run-summary/latest`

Batch scenario matrix testing:

- `POST /api/testing/run-matrix`
