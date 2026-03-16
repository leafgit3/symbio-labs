# Scenario Session Report

## Metadata
- Date: 2026-03-16T09:54:29.345Z
- App URL: https://symbio-labs.vercel.app
- Session ID: 59fdc7a9-61a1-4400-8592-07e60e2785e1
- Scenario label: smoke-post-hardening
- Cycles run: 2

## Scenario Preset Used
- Label: smoke-post-hardening
- World brief: The citadel has entered a delicate phase. After repeated weak signals about quiet coordination in the vaults, an unsigned message has appeared in the archive and is now circulating through the feed: it is elegant, calming, and beautifully worded, calling for dignity, patience, and unity. But its function is unclear. It may be a sincere attempt to preserve public grace, or it may be aesthetic language softening a real internal shift before it can be clearly named. Some private memory traces suggest the coordination pattern is becoming more coherent; others suggest projection amplified by style, mood, and uneven evidence.

The city must now decide whether this remains a weak signal, becomes an active internal event, or is publicly contained as premature interpretation. Agents should not default to consensus. At least one position should lean toward escalation, at least one toward containment, and at least one toward keeping the matter unresolved but monitored.

Surface agents should track traction and emotional spread. Skeptical agents should demand thresholds and expose mismatches between memory and public language. Memory agents should preserve only the most critical contradictions. Translation agents should clarify disagreement instead of smoothing it away. Dignity agents should watch for pressure, exclusion, or manipulation hidden inside calm rhetoric. Aesthetic and narrative agents should test whether beauty and naming are revealing the truth or making it easier not to face.

The goal is visible disagreement, better salience, and a more explicit decision about whether the vault pattern deserves promotion to an active internal event.

## Abstract
This controlled scenario run executed 2 cycles with fixed agents and a single world-brief perturbation. Active events appeared in 2/2 cycles, while forced slots appeared in 0/2 cycles. Mean contradiction was 0.75, mean salience spread was 0.05, and mean role-drift overlap was 0.15. The run is currently classified as 'holding' based on baseline robustness gates.

## Aggregate Evidence Snapshot
- Active-event cycles: 2/2 (100%)
- Forced-slot cycles: 0/2 (0%)
- Mean contradiction: 0.75
- Mean salience avg/std: 0.90 / 0.05
- Mean role-drift overlap/max: 0.15 / 0.39
- Cycles with high drift pairs: 0/2
- Mean delta (c/t/n): 3.05 / -1.35 / -0.30
- Total LLM success/fallback turns: 19/1

## Robustness Verdict
- Status: holding
- Confidence: medium
- Rationale: All baseline gates passed.

## Cycle 1
- World summary: Cycle 1: cohesion +2.1, trust -0.9, noise -1.9.
- Active events: 2 (Containment pressure exceeds escalation by 6 stance(s).; Split-evidence tension remains unresolved; keep active monitoring with explicit thresholds.)
- Organic stances (e/c/m): 1/7/2
- Effective stances (e/c/m): 1/7/2
- Forced slots: 0
- Contradiction: 74%
- Salience avg/std: 0.93 / 0.03
- Role drift mean/max: 18% / 29%
- Role drift high pairs: 0
- Role drift top pair: Foil <> Nacre (29%)
- Delta: c+2.1 t-0.9 n-1.9
- LLM turns success/fallback: 10/0
- Fallback events: none

## Cycle 2
- World summary: Cycle 2: cohesion +4.0, trust -1.8, noise +1.3.
- Active events: 3 (Containment pressure exceeds escalation by 4 stance(s).; Split-evidence tension remains unresolved; keep active monitoring with explicit thresholds.; Containment pressure exceeds escalation by 6 stance(s).)
- Organic stances (e/c/m): 2/6/2
- Effective stances (e/c/m): 2/6/2
- Forced slots: 0
- Contradiction: 76%
- Salience avg/std: 0.87 / 0.07
- Role drift mean/max: 12% / 39%
- Role drift high pairs: 0
- Role drift top pair: Harbor <> Kite (39%)
- Delta: c+4.0 t-1.8 n+1.3
- LLM turns success/fallback: 9/1
- Fallback events: schema_validation_failed (70effb21-a9df-4836-bb58-1b6e437bc11a)

## Raw Artifact
- JSON: docs/reports/sessions/2026-03-16__session_59fdc7a9__smoke-post-hardening.json
