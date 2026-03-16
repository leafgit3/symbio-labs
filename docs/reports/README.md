# Reports Phase Framework

This folder defines the reporting standard for robustness testing across fresh simulation sessions.

## Reporting Goal

Validate whether the current structural fixes hold under world-brief perturbations, and determine if the remaining issue is primarily tuning/balance rather than orchestration failure.

## Style Rule

- Narrative-first, table-light.
- Reports should read like short technical papers, not spreadsheets.
- Use compact metric bullets for evidence and keep full raw values in JSON appendix artifacts.

## What Data Matters Most

Use these as first-class report signals:

1. Active event promotion:
- cycles with `active_events > 0`
- consistency across scenario variants

2. Organic vs forced stance diversity:
- `organic` stance counts by cycle
- `effective` stance counts by cycle
- `forcedSlotsCount` and injected stance details

3. Stance distribution by cycle:
- `escalate / contain / monitor` trend
- containment-heavy bias check

4. Contradiction and salience:
- `contradictionScore` trend
- `salienceAvg` and `salienceStdDev` trend
- flattening warning if spread collapses

5. Trust / noise / cohesion behavior:
- delta envelope by cycle
- whether lower noise remains stable without trust collapse

6. Feed vs memory relationship:
- mismatch interpretation (signal vs wording noise)
- whether divergence appears strategically meaningful

7. Role drift / collapse:
- near-neighbor behavior by agent role
- signs of profile collapse despite saved profiles

8. Scenario sensitivity:
- exact world-brief changes
- downstream behavior changes attributable to those changes

## Report Artifacts

- `templates/session_robustness_report.md`:
  primary narrative report (paper-style)
- `templates/scenario_run_log.md`:
  per-scenario execution notes (block format)
- `templates/session_robustness_report.json`:
  machine-readable metrics appendix
- `world_briefs/*.txt`:
  reusable scenario briefs for controlled runs
- `../../scripts/reports/run-controlled-scenario.mjs`:
  API runner that executes a scenario cycle-by-cycle and writes JSON + narrative report files
- `02_runbook_cycle_by_cycle.md`:
  copy-paste commands for running the initial scenario set one by one

## Suggested Session Naming

Use deterministic labels:

`YYYY-MM-DD__session_<short-id>__<test-theme>`

Example:

`2026-03-16__session_2a6345af__vault-perturbation`

## Minimal Acceptance Gates

A session is "structurally stable" only if all are true:

- Active events appear in most cycles (`>= 60%` baseline target)
- Forced slot usage stays low (`<= 20%` baseline target)
- Salience remains non-flat (`salienceStdDev > 0.03` baseline target)
- No repeated trust collapse pattern across scenarios
- Organic/effective stance gap remains auditable and explicit

These thresholds are operational defaults, not hard science. Adjust when benchmark data matures.

## Automated Run Example

```bash
node scripts/reports/run-controlled-scenario.mjs \
  --label control_baseline_replay \
  --brief-file docs/reports/world_briefs/control_baseline_replay.txt \
  --cycles 5 \
  --pause-ms 1500
```
