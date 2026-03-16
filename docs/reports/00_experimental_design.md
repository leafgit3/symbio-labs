# Experimental Design (Robustness Phase)

## Purpose
Test whether current structural fixes remain stable across world-brief perturbations while keeping agents and runtime settings constant.

## Primary Question
Do stance diversity, event promotion, and salience stratification hold under slightly different scenario conditions?

## Secondary Question
Is the remaining issue now primarily balance/tuning (for example containment bias) rather than orchestration failure?

## Core Hypotheses

### H1: Structural Stability
Under controlled perturbations, active events continue to appear in most cycles and salience remains non-flat.

### H2: Explicit Diversity Integrity
Organic and effective stance distributions remain clearly distinguishable, with low forced-slot frequency.

### H3: Envelope Stability
Noise remains controlled without repeated trust collapse across scenarios.

## Controls (Keep Constant)
- Saved agent profiles
- LLM endpoint and settings
- Cycle count per scenario (default: 5)
- Reporting method and metrics

## Independent Variable
- World brief content (scenario perturbation only)

## Dependent Signals
- Active event promotion rate
- Organic vs effective stance counts (e/c/m)
- Forced slot frequency and injected stance type
- Contradiction score trend
- Salience avg and spread trend
- Delta envelope: cohesion / trust / noise
- LLM fallback/success counts
- Feed-vs-memory divergence type
- Role drift / near-neighbor convergence

## Run Protocol (One-by-One)
1. Reset simulation to start a fresh session.
2. Set scenario label + world brief.
3. Run cycle 1, record observations.
4. Repeat until cycle 5.
5. Write scenario wrap-up before moving to next scenario.
6. Start a new session for the next scenario.

## Evidence Discipline
- No major interpretation before cycle 3.
- Distinguish observation vs inference explicitly.
- Keep any fallback diversity labeled as orchestrator-assisted, not organic.

## Minimum Session Acceptance Gates
- Active events in >= 60% of cycles
- Forced slots in <= 20% of cycles
- Salience stddev > 0.03 (non-flat)
- No repeated trust-collapse signature
- Organic/effective stance gap remains explicit

## Status Labels
- `holding`: gates mostly met, no structural regression pattern
- `mixed`: partial pass with notable fragility
- `failing`: repeated structural regression across scenarios
