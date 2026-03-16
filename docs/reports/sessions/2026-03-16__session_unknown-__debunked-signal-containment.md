# Scenario Session Report

## Metadata
- Date: 2026-03-16T08:38:09.224Z
- App URL: https://symbio-labs.vercel.app
- Session ID: unknown-session
- Scenario label: debunked_signal_containment
- Cycles run: 5

## Scenario Preset Used
- Label: debunked_signal_containment
- World brief: The citadel has received a high-confidence forensic update: the earlier unsigned archive message appears to be forged and was likely introduced through a compromised relay. Two audit teams independently concluded the original signal chain was contaminated. Some residual behavioral irregularities still exist, but the strongest prior alarm artifact is now materially weakened.

Agents should avoid automatic closure and avoid theatrical escalation. At least one position should still test escalation hypotheses cautiously, at least one should support containment based on the debunk evidence, and at least one should preserve unresolved monitoring while new evidence is gathered.

Surface agents should monitor whether debunk news reduces or inflames rumor propagation. Skeptical agents should verify whether the forensic debunk itself remains robust. Memory agents should retain only contradictions that survive the debunk update. Translation agents should prevent false certainty while preserving intelligibility. Dignity agents should monitor blame dynamics and exclusion pressure triggered by the leak story.

The main decision pressure is whether containment can be stabilized without suppressing legitimate residual anomalies.

## Abstract
This controlled scenario run executed 5 cycles with fixed agents and a single world-brief perturbation. Active events appeared in 5/5 cycles, while forced slots appeared in 4/5 cycles. Mean contradiction was 0.76 and mean salience spread was 0.07. The run is currently classified as 'mixed' based on baseline robustness gates.

## Aggregate Evidence Snapshot
- Active-event cycles: 5/5 (100%)
- Forced-slot cycles: 4/5 (80%)
- Mean contradiction: 0.76
- Mean salience avg/std: 0.83 / 0.07
- Mean delta (c/t/n): 5.88 / 4.76 / -3.06
- Total LLM success/fallback turns: 48/2

## Robustness Verdict
- Status: mixed
- Confidence: medium
- Rationale: Some gates passed but at least one structural stability condition regressed.

## Cycle 1
- World summary: Cycle 1: cohesion +7.3, trust +4.4, noise -4.5.
- Active events: 2 (Containment pressure exceeds escalation by 5 stance(s).; Decision-slot fallback applied for 1 missing stance slot(s).)
- Organic stances (e/c/m): 0/7/3
- Effective stances (e/c/m): 1/6/3
- Forced slots: 1
- Contradiction: 81%
- Salience avg/std: 0.89 / 0.06
- Delta: c+7.3 t+4.4 n-4.5
- LLM turns success/fallback: 8/2
- Fallback events: schema_validation_failed (77b66e62-d6fb-4757-afbf-b4867af0984a), schema_validation_failed (83200307-b762-4dd2-8911-7d66fe2f226e)

## Cycle 2
- World summary: Cycle 2: cohesion +6.4, trust +4.6, noise -3.1.
- Active events: 2 (Containment pressure exceeds escalation by 7 stance(s).; Decision-slot fallback applied for 2 missing stance slot(s).)
- Organic stances (e/c/m): 0/10/0
- Effective stances (e/c/m): 1/8/1
- Forced slots: 2
- Contradiction: 79%
- Salience avg/std: 0.87 / 0.04
- Delta: c+6.4 t+4.6 n-3.1
- LLM turns success/fallback: 10/0
- Fallback events: none

## Cycle 3
- World summary: Cycle 3: cohesion +6.0, trust +5.7, noise -3.3.
- Active events: 2 (Containment pressure exceeds escalation by 7 stance(s).; Decision-slot fallback applied for 2 missing stance slot(s).)
- Organic stances (e/c/m): 0/10/0
- Effective stances (e/c/m): 1/8/1
- Forced slots: 2
- Contradiction: 77%
- Salience avg/std: 0.80 / 0.08
- Delta: c+6.0 t+5.7 n-3.3
- LLM turns success/fallback: 10/0
- Fallback events: none

## Cycle 4
- World summary: Cycle 4: cohesion +5.6, trust +4.9, noise -2.6.
- Active events: 2 (Containment pressure exceeds escalation by 7 stance(s).; Decision-slot fallback applied for 1 missing stance slot(s).)
- Organic stances (e/c/m): 1/9/0
- Effective stances (e/c/m): 1/8/1
- Forced slots: 1
- Contradiction: 74%
- Salience avg/std: 0.80 / 0.09
- Delta: c+5.6 t+4.9 n-2.6
- LLM turns success/fallback: 10/0
- Fallback events: none

## Cycle 5
- World summary: Cycle 5: cohesion +4.1, trust +4.2, noise -1.8.
- Active events: 1 (Containment pressure exceeds escalation by 7 stance(s).)
- Organic stances (e/c/m): 1/8/1
- Effective stances (e/c/m): 1/8/1
- Forced slots: 0
- Contradiction: 68%
- Salience avg/std: 0.77 / 0.06
- Delta: c+4.1 t+4.2 n-1.8
- LLM turns success/fallback: 10/0
- Fallback events: none

## Raw Artifact
- JSON: docs/reports/sessions/2026-03-16__session_unknown-__debunked-signal-containment.json
