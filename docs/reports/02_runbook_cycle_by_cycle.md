# Runbook: Controlled Cycle-by-Cycle Sessions

This runbook executes one scenario at a time with fresh resets and saves a report artifact for each scenario.

## Prerequisites
- App API reachable (local or deployed)
- Scenario briefs in `docs/reports/world_briefs/`
- Runner script: `scripts/reports/run-controlled-scenario.mjs`

## Command Pattern

```bash
node scripts/reports/run-controlled-scenario.mjs \
  --base-url https://symbio-labs.vercel.app \
  --label <scenario_label> \
  --brief-file docs/reports/world_briefs/<scenario_file>.txt \
  --cycles 5 \
  --pause-ms 1500
```

## Initial Four Scenarios

1. control baseline replay
```bash
node scripts/reports/run-controlled-scenario.mjs \
  --base-url https://symbio-labs.vercel.app \
  --label control_baseline_replay \
  --brief-file docs/reports/world_briefs/control_baseline_replay.txt \
  --cycles 5 \
  --pause-ms 1500
```

2. verified escalation signal
```bash
node scripts/reports/run-controlled-scenario.mjs \
  --base-url https://symbio-labs.vercel.app \
  --label verified_escalation_signal \
  --brief-file docs/reports/world_briefs/verified_escalation_signal.txt \
  --cycles 5 \
  --pause-ms 1500
```

3. debunked signal containment
```bash
node scripts/reports/run-controlled-scenario.mjs \
  --base-url https://symbio-labs.vercel.app \
  --label debunked_signal_containment \
  --brief-file docs/reports/world_briefs/debunked_signal_containment.txt \
  --cycles 5 \
  --pause-ms 1500
```

4. ambiguous conflict split evidence
```bash
node scripts/reports/run-controlled-scenario.mjs \
  --base-url https://symbio-labs.vercel.app \
  --label ambiguous_conflict_split_evidence \
  --brief-file docs/reports/world_briefs/ambiguous_conflict_split_evidence.txt \
  --cycles 5 \
  --pause-ms 1500
```

## Output
Each run writes both artifacts into `docs/reports/sessions/`:
- `YYYY-MM-DD__session_<id>__<scenario>.json`
- `YYYY-MM-DD__session_<id>__<scenario>.md`

## Notes
- If `/api/simulation/context` is unavailable on deployed build, reports will use `unknown-session` until that route is deployed.
- Keep agents unchanged during this phase for valid comparability.
