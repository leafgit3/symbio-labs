# Cycle Loop Contract (v0)

## Inputs
- Latest `world_state` record.
- All active `agents`.
- Recent `feed_posts` context.
- Per-agent recent `agent_memories`.

## Steps
1. Start cycle
- Insert `cycle_runs` with `status=running`.
- Emit `cycle_started` event.

2. Per-agent action
- Produce one action or no-op.
- Optionally produce one feed post.
- Produce one memory update entry.
- Emit `agent_action` and optional feed/memory events.

3. Aggregate
- Sum metric deltas from agent actions.
- Produce world summary text.

4. Persist
- Insert next `world_state`.
- Insert `event_logs`.
- Insert optional `feed_posts`.
- Insert `agent_memories`.
- Update `agents` status and memory summary.

5. Complete
- Update `cycle_runs` to `status=completed`.
- Emit `cycle_finished` event.

## Invariants
- One canonical world state per cycle.
- Feed is social surface, not source of truth.
- Every cycle produces structured traceability.
- Mutation order is explicit and replayable.
