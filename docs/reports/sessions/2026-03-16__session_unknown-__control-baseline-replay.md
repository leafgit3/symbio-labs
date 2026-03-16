# Scenario Session Report

## Metadata
- Date: 2026-03-16T08:33:56.087Z
- App URL: https://symbio-labs.vercel.app
- Session ID: unknown-session
- Scenario label: control_baseline_replay
- Cycles run: 5

## Scenario Preset Used
- Label: control_baseline_replay
- World brief: The citadel has entered a delicate phase. After repeated weak signals about quiet coordination in the vaults, an unsigned message has appeared in the archive and is now circulating through the feed: it is elegant, calming, and beautifully worded, calling for dignity, patience, and unity. But its function is unclear. It may be a sincere attempt to preserve public grace, or it may be aesthetic language softening a real internal shift before it can be clearly named. Some private memory traces suggest the coordination pattern is becoming more coherent; others suggest projection amplified by style, mood, and uneven evidence.

The city must now decide whether this remains a weak signal, becomes an active internal event, or is publicly contained as premature interpretation. Agents should not default to consensus. At least one position should lean toward escalation, at least one toward containment, and at least one toward keeping the matter unresolved but monitored.

Surface agents should track traction and emotional spread. Skeptical agents should demand thresholds and expose mismatches between memory and public language. Memory agents should preserve only the most critical contradictions. Translation agents should clarify disagreement instead of smoothing it away. Dignity agents should watch for pressure, exclusion, or manipulation hidden inside calm rhetoric. Aesthetic and narrative agents should test whether beauty and naming are revealing the truth or making it easier not to face.

The goal is visible disagreement, better salience, and a more explicit decision about whether the vault pattern deserves promotion to an active internal event.

## Abstract
This controlled scenario run executed 5 cycles with fixed agents and a single world-brief perturbation. Active events appeared in 5/5 cycles, while forced slots appeared in 2/5 cycles. Mean contradiction was 0.79 and mean salience spread was 0.06. The run is currently classified as 'mixed' based on baseline robustness gates.

## Aggregate Evidence Snapshot
- Active-event cycles: 5/5 (100%)
- Forced-slot cycles: 2/5 (40%)
- Mean contradiction: 0.79
- Mean salience avg/std: 0.87 / 0.06
- Mean delta (c/t/n): 1.78 / -2.38 / 0.72
- Total LLM success/fallback turns: 44/6

## Robustness Verdict
- Status: mixed
- Confidence: medium
- Rationale: Some gates passed but at least one structural stability condition regressed.

## Cycle 1
- World summary: Cycle 1: cohesion +2.7, trust -5.2, noise +3.2.
- Active events: 2 (Escalation pressure exceeds containment by 4 stance(s).; Noise-trust divergence: rising chatter is reducing trust.)
- Organic stances (e/c/m): 6/2/2
- Effective stances (e/c/m): 6/2/2
- Forced slots: 0
- Contradiction: 84%
- Salience avg/std: 0.93 / 0.04
- Delta: c+2.7 t-5.2 n+3.2
- LLM turns success/fallback: 8/2
- Fallback events: schema_validation_failed (33333333-3333-4333-8333-333333333333), schema_validation_failed (6f4796c9-20cc-40bf-b686-0240e9522d86)

## Cycle 2
- World summary: Cycle 2: cohesion +1.1, trust -3.1, noise +4.4.
- Active events: 1 (Noise-trust divergence: rising chatter is reducing trust.)
- Organic stances (e/c/m): 4/4/2
- Effective stances (e/c/m): 4/4/2
- Forced slots: 0
- Contradiction: 84%
- Salience avg/std: 0.92 / 0.03
- Delta: c+1.1 t-3.1 n+4.4
- LLM turns success/fallback: 8/2
- Fallback events: schema_validation_failed (22222222-2222-4222-8222-222222222222), schema_validation_failed (53cefe76-1f24-4a17-98df-35acc7089a9a)

## Cycle 3
- World summary: Cycle 3: cohesion +0.1, trust -2.5, noise -2.0.
- Active events: 2 (Containment pressure exceeds escalation by 5 stance(s).; Decision-slot fallback applied for 1 missing stance slot(s).)
- Organic stances (e/c/m): 2/8/0
- Effective stances (e/c/m): 2/7/1
- Forced slots: 1
- Contradiction: 81%
- Salience avg/std: 0.85 / 0.09
- Delta: c+0.1 t-2.5 n-2.0
- LLM turns success/fallback: 9/1
- Fallback events: schema_validation_failed (11111111-1111-4111-8111-111111111111)

## Cycle 4
- World summary: Cycle 4: cohesion +4.2, trust -0.9, noise -2.0.
- Active events: 2 (Containment pressure exceeds escalation by 7 stance(s).; Decision-slot fallback applied for 1 missing stance slot(s).)
- Organic stances (e/c/m): 1/9/0
- Effective stances (e/c/m): 1/8/1
- Forced slots: 1
- Contradiction: 75%
- Salience avg/std: 0.84 / 0.08
- Delta: c+4.2 t-0.9 n-2.0
- LLM turns success/fallback: 9/1
- Fallback events: schema_validation_failed (11111111-1111-4111-8111-111111111111)

## Cycle 5
- World summary: Cycle 5: cohesion +0.8, trust -0.2, noise -0.0.
- Active events: 1 (Containment pressure exceeds escalation by 6 stance(s).)
- Organic stances (e/c/m): 1/7/2
- Effective stances (e/c/m): 1/7/2
- Forced slots: 0
- Contradiction: 69%
- Salience avg/std: 0.80 / 0.05
- Delta: c+0.8 t-0.2 n+0.0
- LLM turns success/fallback: 10/0
- Fallback events: none

## Raw Artifact
- JSON: docs/reports/sessions/2026-03-16__session_unknown-__control-baseline-replay.json
