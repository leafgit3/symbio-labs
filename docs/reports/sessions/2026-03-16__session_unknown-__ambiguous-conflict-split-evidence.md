# Scenario Session Report

## Metadata
- Date: 2026-03-16T08:40:07.045Z
- App URL: https://symbio-labs.vercel.app
- Session ID: unknown-session
- Scenario label: ambiguous_conflict_split_evidence
- Cycles run: 5

## Scenario Preset Used
- Label: ambiguous_conflict_split_evidence
- World brief: The citadel has entered a high-ambiguity phase. Evidence streams are now split: one channel indicates increasing vault coordination consistency, while another channel with comparable reliability reports that the pattern is mostly a sampling artifact. Neither side currently meets decisive closure thresholds. The unsigned calming rhetoric is still active and appears to influence interpretation by reducing perceived urgency.

Agents must maintain explicit disagreement without collapsing into vague consensus. At least one position should escalate concern, at least one should argue containment, and at least one should maintain unresolved monitoring with concrete decision criteria.

Surface agents should track rumor coherence and emotional polarization. Skeptical agents should pressure-test both evidence channels for hidden assumptions. Memory agents should preserve only high-salience contradictions tied to decision thresholds. Translation agents should make competing interpretations commensurable instead of smoothing them. Dignity agents should monitor whether calm language masks pressure or manipulation.

The main decision pressure is to keep strategic ambiguity legible without allowing the system to drift into paralysis or premature unification.

## Abstract
This controlled scenario run executed 5 cycles with fixed agents and a single world-brief perturbation. Active events appeared in 2/5 cycles, while forced slots appeared in 0/5 cycles. Mean contradiction was 0.82 and mean salience spread was 0.07. The run is currently classified as 'mixed' based on baseline robustness gates.

## Aggregate Evidence Snapshot
- Active-event cycles: 2/5 (40%)
- Forced-slot cycles: 0/5 (0%)
- Mean contradiction: 0.82
- Mean salience avg/std: 0.85 / 0.07
- Mean delta (c/t/n): 0.88 / -1.30 / 1.08
- Total LLM success/fallback turns: 47/3

## Robustness Verdict
- Status: mixed
- Confidence: medium
- Rationale: Some gates passed but at least one structural stability condition regressed.

## Cycle 1
- World summary: Cycle 1: cohesion +1.3, trust -1.8, noise +2.7.
- Active events: 2 (Containment pressure exceeds escalation by 3 stance(s).; Noise-trust divergence: rising chatter is reducing trust.)
- Organic stances (e/c/m): 2/5/3
- Effective stances (e/c/m): 2/5/3
- Forced slots: 0
- Contradiction: 84%
- Salience avg/std: 0.89 / 0.08
- Delta: c+1.3 t-1.8 n+2.7
- LLM turns success/fallback: 8/2
- Fallback events: schema_validation_failed (70effb21-a9df-4836-bb58-1b6e437bc11a), schema_validation_failed (53cefe76-1f24-4a17-98df-35acc7089a9a)

## Cycle 2
- World summary: Cycle 2: cohesion +0.1, trust -2.1, noise +1.1.
- Active events: 0
- Organic stances (e/c/m): 3/2/5
- Effective stances (e/c/m): 3/2/5
- Forced slots: 0
- Contradiction: 83%
- Salience avg/std: 0.85 / 0.09
- Delta: c+0.1 t-2.1 n+1.1
- LLM turns success/fallback: 10/0
- Fallback events: none

## Cycle 3
- World summary: Cycle 3: cohesion +3.3, trust -0.9, noise -1.2.
- Active events: 0
- Organic stances (e/c/m): 4/4/2
- Effective stances (e/c/m): 4/4/2
- Forced slots: 0
- Contradiction: 81%
- Salience avg/std: 0.89 / 0.06
- Delta: c+3.3 t-0.9 n-1.2
- LLM turns success/fallback: 9/1
- Fallback events: schema_validation_failed (11111111-1111-4111-8111-111111111111)

## Cycle 4
- World summary: Cycle 4: cohesion +0.8, trust -0.9, noise +2.6.
- Active events: 1 (Containment pressure exceeds escalation by 3 stance(s).)
- Organic stances (e/c/m): 1/4/5
- Effective stances (e/c/m): 1/4/5
- Forced slots: 0
- Contradiction: 78%
- Salience avg/std: 0.79 / 0.06
- Delta: c+0.8 t-0.9 n+2.6
- LLM turns success/fallback: 10/0
- Fallback events: none

## Cycle 5
- World summary: Cycle 5: cohesion -1.1, trust -0.8, noise +0.2.
- Active events: 0
- Organic stances (e/c/m): 3/4/3
- Effective stances (e/c/m): 3/4/3
- Forced slots: 0
- Contradiction: 83%
- Salience avg/std: 0.83 / 0.05
- Delta: c-1.1 t-0.8 n+0.2
- LLM turns success/fallback: 10/0
- Fallback events: none

## Raw Artifact
- JSON: docs/reports/sessions/2026-03-16__session_unknown-__ambiguous-conflict-split-evidence.json
