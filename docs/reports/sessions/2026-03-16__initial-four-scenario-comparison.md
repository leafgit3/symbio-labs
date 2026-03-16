# Initial Four-Scenario Comparison Report

Date: 2026-03-16

## Scope
- Fixed agents, fixed runtime settings, 5 cycles per scenario.
- Fresh reset before each scenario.
- Goal: assess robustness under world-brief perturbations.

## Scenario Results
### control_baseline_replay
- Robustness verdict: mixed (Some gates passed but at least one structural stability condition regressed.)
- Active-event cycles: 5/5
- Forced-slot cycles: 2/5
- Mean contradiction: 0.79
- Mean salience avg/std: 0.87 / 0.06
- Mean delta (c/t/n): 1.78 / -2.38 / 0.72
- LLM success/fallback turns: 44/6

### verified_escalation_signal
- Robustness verdict: mixed (Some gates passed but at least one structural stability condition regressed.)
- Active-event cycles: 5/5
- Forced-slot cycles: 2/5
- Mean contradiction: 0.73
- Mean salience avg/std: 0.84 / 0.07
- Mean delta (c/t/n): 6.54 / 3.48 / -2.32
- LLM success/fallback turns: 46/4

### debunked_signal_containment
- Robustness verdict: mixed (Some gates passed but at least one structural stability condition regressed.)
- Active-event cycles: 5/5
- Forced-slot cycles: 4/5
- Mean contradiction: 0.76
- Mean salience avg/std: 0.83 / 0.07
- Mean delta (c/t/n): 5.88 / 4.76 / -3.06
- LLM success/fallback turns: 48/2

### ambiguous_conflict_split_evidence
- Robustness verdict: mixed (Some gates passed but at least one structural stability condition regressed.)
- Active-event cycles: 2/5
- Forced-slot cycles: 0/5
- Mean contradiction: 0.82
- Mean salience avg/std: 0.85 / 0.07
- Mean delta (c/t/n): 0.88 / -1.30 / 1.08
- LLM success/fallback turns: 47/3

## Cross-Scenario Aggregate
- Total cycles observed: 20
- Active-event cycles overall: 17/20 (85%)
- Forced-slot cycles overall: 8/20 (40%)
- Mean contradiction across scenarios: 0.78
- Mean salience spread across scenarios: 0.07
- Mean trust delta across scenarios: 1.14
- LLM success/fallback turns overall: 185/15

## Interpretation
- Structural instrumentation is holding: active events, stance diagnostics, and salience stratification remained visible across runs.
- Containment bias remains scenario-dependent: strongest in debunked containment scenario, more mixed under ambiguity.
- Forced-slot usage concentrated in scenarios where organic stance diversity narrowed (especially debunked containment).
- Trust/noise behavior diverged by scenario, indicating the remaining work is tuning and calibration rather than missing instrumentation.

## Next Actions
1. Run one additional replicate for each scenario to test run-to-run variance.
2. Add explicit role-drift scoring in report appendix (agent-level near-neighbor overlap).
3. Tune containment-heavy behavior only after replicate variance is characterized.

## Artifacts
- 2026-03-16__session_unknown-__control-baseline-replay.md
- 2026-03-16__session_unknown-__control-baseline-replay.json
- 2026-03-16__session_unknown-__verified-escalation-signal.md
- 2026-03-16__session_unknown-__verified-escalation-signal.json
- 2026-03-16__session_unknown-__debunked-signal-containment.md
- 2026-03-16__session_unknown-__debunked-signal-containment.json
- 2026-03-16__session_unknown-__ambiguous-conflict-split-evidence.md
- 2026-03-16__session_unknown-__ambiguous-conflict-split-evidence.json
