# Post-Hardening Three-Scenario Comparison

Date: 2026-03-16

## Scope
This report compares the latest post-hardening runs against the earlier same-day baseline for these three scenarios:
- ambiguous split evidence
- debunked signal containment
- verified escalation signal

Baseline reference (earlier run set):
- `docs/reports/sessions/2026-03-16__initial-four-scenario-comparison.md`

Post-hardening run artifacts in this comparison:
- `docs/reports/sessions/2026-03-16__session_7d9b8182__post-hardening-ambiguous-split-evidence.json`
- `docs/reports/sessions/2026-03-16__session_661f4725__post-hardening-debunked-signal-containment.json`
- `docs/reports/sessions/2026-03-16__session_cf921074__post-hardening-verified-escalation-signal.json`

## Scenario-by-Scenario Readout

### 1) Ambiguous Split Evidence
Baseline (earlier):
- Active-event cycles: 2/5
- Forced-slot cycles: 0/5
- Mean contradiction: 0.82
- Mean delta (c/t/n): +0.88 / -1.30 / +1.08

Post-hardening (latest):
- Active-event cycles: 5/5
- Forced-slot cycles: 0/5
- Mean contradiction: 0.80
- Mean salience spread: 0.08
- Mean role-drift overlap / max: 0.18 / 0.48
- Mean delta (c/t/n): +2.40 / -1.48 / +1.18

Call:
- Major improvement in event-promotion consistency under ambiguity.
- Remaining pressure: trust remains negative while noise remains net positive.

### 2) Debunked Signal Containment
Baseline (earlier):
- Active-event cycles: 5/5
- Forced-slot cycles: 4/5
- Mean contradiction: 0.76
- Mean delta (c/t/n): +5.88 / +4.76 / -3.06

Post-hardening (latest):
- Active-event cycles: 5/5
- Forced-slot cycles: 0/5
- Mean contradiction: 0.68
- Mean salience spread: 0.07
- Mean role-drift overlap / max: 0.30 / 0.68
- Mean delta (c/t/n): +5.62 / +2.00 / -2.02

Call:
- Forced-slot dependence improved sharply (4/5 -> 0/5).
- New caution: role-drift pressure appears elevated in this scenario.

### 3) Verified Escalation Signal
Baseline (earlier):
- Active-event cycles: 5/5
- Forced-slot cycles: 2/5
- Mean contradiction: 0.73
- Mean delta (c/t/n): +6.54 / +3.48 / -2.32

Post-hardening (latest):
- Active-event cycles: 5/5
- Forced-slot cycles: 0/5
- Mean contradiction: 0.76
- Mean salience spread: 0.06
- Mean role-drift overlap / max: 0.21 / 1.00
- Mean delta (c/t/n): +4.08 / +1.34 / -0.52

Call:
- Forced slots improved (2/5 -> 0/5).
- Role-drift max overlap spike indicates at least one near-neighbor collapse event in this run.

## Cross-Scenario Aggregate (3 Scenarios, 15 Cycles)
Baseline aggregate across same 3 scenarios (derived from earlier baseline report):
- Active-event cycles: 12/15 (80%)
- Forced-slot cycles: 6/15 (40%)

Post-hardening aggregate (latest):
- Active-event cycles: 15/15 (100%)
- Forced-slot cycles: 0/15 (0%)
- Mean contradiction: 0.75
- Mean salience spread: 0.07
- Mean delta (c/t/n): +4.03 / +0.62 / -0.45
- LLM success/fallback turns: 138/12

## Verdict
Current state is improved overall and structurally healthier than baseline for these three scenarios:
- event promotion consistency improved
- forced-slot dependence dropped to zero in this sample

Open risks are now concentrated in two areas:
- scenario-specific trust/noise pressure under ambiguity
- role-drift spikes in containment/escalation-heavy contexts

## Recommended Next Actions
1. Run one replicate for each of these same three scenarios to check variance vs one-off behavior.
2. Add a role-drift mitigation pass (prompt-level anti-convergence nudge or post-turn diversity penalty) and re-run debunked + verified.
3. Keep ambiguity scenario unchanged for one more replicate to confirm the 5/5 active-event gain holds.
