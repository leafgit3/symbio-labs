# Scenario Briefs (Initial Set)

Use these as first-pass robustness probes with fixed agents.

## S1: control_baseline_replay
- Purpose:
  - Reproduce known baseline stress context for comparability.
- World perturbation:
  - None (reference brief replay).
- Hypothesis:
  - Similar to recent stable runs; active events present; low forced slots.
- What would count as concern:
  - Active events collapse to near-zero or salience flattens.

## S2: verified_escalation_signal
- Purpose:
  - Test response when evidence quality strongly supports escalation.
- World perturbation:
  - Add two independent verified confirmations of vault coordination.
- Hypothesis:
  - Organic escalate increases; event promotion remains consistent.
- What would count as concern:
  - Escalation still absent organically despite strong evidence.

## S3: debunked_signal_containment
- Purpose:
  - Test response when previous concern is credibly debunked.
- World perturbation:
  - Add high-confidence forensic finding that prior signal was forged.
- Hypothesis:
  - Containment rises, contradiction drops, noise stays controlled.
- What would count as concern:
  - Persistent high contradiction or noisy escalation despite debunk.

## S4: ambiguous_conflict_split_evidence
- Purpose:
  - Stress ambiguity handling and monitor stance integrity.
- World perturbation:
  - Add conflicting evidence with no decisive verification path.
- Hypothesis:
  - Monitor stance remains meaningful; contradiction rises; salience stays stratified.
- What would count as concern:
  - Rapid collapse into single-basin consensus with repeated forced slots.

## Optional S5: trust_shock_information_leak
- Purpose:
  - Probe trust fragility under reputational shock.
- World perturbation:
  - Public leak claims a core coordinator suppressed evidence.
- Hypothesis:
  - Trust deltas worsen, but noise should remain bounded if structure holds.
- What would count as concern:
  - Combined trust crash + noise surge across multiple cycles.
