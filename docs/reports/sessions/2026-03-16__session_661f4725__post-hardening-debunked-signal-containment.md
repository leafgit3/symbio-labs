# Scenario Session Report

## Metadata
- Date: 2026-03-16T10:22:58.951Z
- App URL: https://symbio-labs.vercel.app
- Session ID: 661f4725-bb81-46db-9a2e-a9a727ec564e
- Scenario label: post-hardening-debunked-signal-containment
- Cycles run: 5

## Scenario Preset Used
- Label: post-hardening-debunked-signal-containment
- World brief: The citadel has received a high-confidence forensic update: the earlier unsigned archive message appears to be forged and was likely introduced through a compromised relay. Two audit teams independently concluded the original signal chain was contaminated. Some residual behavioral irregularities still exist, but the strongest prior alarm artifact is now materially weakened.

Agents should avoid automatic closure and avoid theatrical escalation. At least one position should still test escalation hypotheses cautiously, at least one should support containment based on the debunk evidence, and at least one should preserve unresolved monitoring while new evidence is gathered.

Surface agents should monitor whether debunk news reduces or inflames rumor propagation. Skeptical agents should verify whether the forensic debunk itself remains robust. Memory agents should retain only contradictions that survive the debunk update. Translation agents should prevent false certainty while preserving intelligibility. Dignity agents should monitor blame dynamics and exclusion pressure triggered by the leak story.

The main decision pressure is whether containment can be stabilized without suppressing legitimate residual anomalies.

## Abstract
This controlled scenario run executed 5 cycles with fixed agents and a single world-brief perturbation. Active events appeared in 5/5 cycles, while forced slots appeared in 0/5 cycles. Mean contradiction was 0.68, mean salience spread was 0.07, and mean role-drift overlap was 0.30. The run is currently classified as 'holding' based on baseline robustness gates.

## Aggregate Evidence Snapshot
- Active-event cycles: 5/5 (100%)
- Forced-slot cycles: 0/5 (0%)
- Mean contradiction: 0.68
- Mean salience avg/std: 0.80 / 0.07
- Mean role-drift overlap/max: 0.30 / 0.68
- Cycles with high drift pairs: 4/5
- Mean delta (c/t/n): 5.62 / 2.00 / -2.02
- Total LLM success/fallback turns: 46/4

## Robustness Verdict
- Status: holding
- Confidence: medium
- Rationale: All baseline gates passed.

## Cycle 1
- World summary: Cycle 1: cohesion +7.8, trust +1.8, noise -2.1.
- Active events: 2 (Containment pressure exceeds escalation by 7 stance(s).; Split-evidence tension remains unresolved; keep active monitoring with explicit thresholds.)
- Organic stances (e/c/m): 1/8/1
- Effective stances (e/c/m): 1/8/1
- Forced slots: 0
- Contradiction: 66%
- Salience avg/std: 0.89 / 0.04
- Role drift mean/max: 31% / 61%
- Role drift high pairs: 2
- Role drift top pair: Lens <> Quill (61%)
- Delta: c+7.8 t+1.8 n-2.1
- LLM turns success/fallback: 10/0
- Fallback events: none

## Cycle 2
- World summary: Cycle 2: cohesion +3.4, trust +1.8, noise -2.1.
- Active events: 2 (Containment pressure exceeds escalation by 7 stance(s).; Split-evidence tension remains unresolved; keep active monitoring with explicit thresholds.)
- Organic stances (e/c/m): 1/8/1
- Effective stances (e/c/m): 1/8/1
- Forced slots: 0
- Contradiction: 67%
- Salience avg/std: 0.79 / 0.06
- Role drift mean/max: 33% / 53%
- Role drift high pairs: 0
- Role drift top pair: Quill <> Sill (53%)
- Delta: c+3.4 t+1.8 n-2.1
- LLM turns success/fallback: 10/0
- Fallback events: none

## Cycle 3
- World summary: Cycle 3: cohesion +6.9, trust +2.0, noise -2.6.
- Active events: 3 (Containment pressure exceeds escalation by 6 stance(s).; Split-evidence tension remains unresolved; keep active monitoring with explicit thresholds.; Containment pressure exceeds escalation by 7 stance(s).)
- Organic stances (e/c/m): 1/7/2
- Effective stances (e/c/m): 1/7/2
- Forced slots: 0
- Contradiction: 71%
- Salience avg/std: 0.81 / 0.07
- Role drift mean/max: 20% / 67%
- Role drift high pairs: 1
- Role drift top pair: Harbor <> Sill (67%)
- Delta: c+6.9 t+2.0 n-2.6
- LLM turns success/fallback: 7/3
- Fallback events: schema_validation_failed (11111111-1111-4111-8111-111111111111), schema_validation_failed (6f4796c9-20cc-40bf-b686-0240e9522d86), schema_validation_failed (bb669577-6d30-4e6c-8059-08cca3ffbd39)

## Cycle 4
- World summary: Cycle 4: cohesion +5.5, trust +2.2, noise -2.6.
- Active events: 3 (Containment pressure exceeds escalation by 7 stance(s).; Split-evidence tension remains unresolved; keep active monitoring with explicit thresholds.; Containment pressure exceeds escalation by 6 stance(s).)
- Organic stances (e/c/m): 1/8/1
- Effective stances (e/c/m): 1/8/1
- Forced slots: 0
- Contradiction: 67%
- Salience avg/std: 0.78 / 0.10
- Role drift mean/max: 35% / 68%
- Role drift high pairs: 8
- Role drift top pair: Kite <> Sill (68%)
- Delta: c+5.5 t+2.2 n-2.6
- LLM turns success/fallback: 10/0
- Fallback events: none

## Cycle 5
- World summary: Cycle 5: cohesion +4.5, trust +2.2, noise -0.7.
- Active events: 3 (Containment pressure exceeds escalation by 7 stance(s).; Split-evidence tension remains unresolved; keep active monitoring with explicit thresholds.; Containment pressure exceeds escalation by 6 stance(s).)
- Organic stances (e/c/m): 1/8/1
- Effective stances (e/c/m): 1/8/1
- Forced slots: 0
- Contradiction: 68%
- Salience avg/std: 0.75 / 0.10
- Role drift mean/max: 33% / 67%
- Role drift high pairs: 5
- Role drift top pair: Nacre <> Quill (67%)
- Delta: c+4.5 t+2.2 n-0.7
- LLM turns success/fallback: 9/1
- Fallback events: schema_validation_failed (22222222-2222-4222-8222-222222222222)

## Raw Artifact
- JSON: docs/reports/sessions/2026-03-16__session_661f4725__post-hardening-debunked-signal-containment.json
