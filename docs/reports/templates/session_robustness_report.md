# Session Robustness Report (Narrative Template)

## Metadata
- Report ID:
- Date:
- Operator:
- App URL / Commit:
- Session ID:
- Baseline reference:
- Runtime notes (model, limits, endpoint settings):

## Abstract
Write 4-6 sentences:
- What was tested.
- Whether structural behavior held.
- Biggest improvement signal.
- Biggest remaining risk.

## Method
- Agent profile policy (saved profiles reused or changed):
- Scenario count and cycles per scenario:
- Reset/session handling:
- Data sources used (History, Events API, run summaries):
- Known caveats:

## Scenario Perturbation Ledger
For each scenario, add one block:

`Scenario: <label>`
- Intended perturbation:
- Exact world brief change vs baseline:
- Why this change matters:
- Cycles executed:

## Findings

### 1) Active Event Promotion
- Interpretation:
- Evidence snapshot:
  - event-active cycles:
  - scenario-to-scenario consistency:
  - regressions:

### 2) Organic vs Forced Stance Diversity
- Interpretation:
- Evidence snapshot:
  - organic stance pattern:
  - effective stance pattern:
  - forced slot frequency:
  - injected stance types:

### 3) Stance Distribution by Cycle
- Interpretation:
- Evidence snapshot:
  - escalation trend:
  - containment trend:
  - monitor trend:
  - containment-heaviness judgment:

### 4) Contradiction and Salience
- Interpretation:
- Evidence snapshot:
  - contradiction trend:
  - salience mean trend:
  - salience spread trend:
  - flattening risk:

### 5) Trust / Noise / Cohesion Envelope
- Interpretation:
- Evidence snapshot:
  - cohesion behavior:
  - trust behavior:
  - noise behavior:
  - stability vs volatility call:

### 6) Feed vs Memory Relationship
- Interpretation:
- Evidence snapshot:
  - divergence type:
  - strategic signal vs phrasing mismatch:
  - notable examples:

### 7) Role Drift / Collapse
- Interpretation:
- Evidence snapshot:
  - near-neighbor clusters:
  - role collapse warnings:
  - agents needing tuning:

### 8) Scenario Sensitivity
- Interpretation:
- Evidence snapshot:
  - which perturbations changed behavior most:
  - which perturbations had little effect:
  - downstream implications:

## Robustness Verdict
- Status: `holding` | `mixed` | `failing`
- Confidence: `low` | `medium` | `high`
- Why this verdict is justified:

## Decisions and Next Actions
- Tuning actions to run next:
- Additional scenarios needed:
- Whether to proceed to next phase:

## Appendix A: Metric Snapshot (Compact)
Provide compact bullets per scenario, no large tables:

`Scenario: <label>`
- active-event cycles:
- forced-slot cycles:
- mean contradiction:
- mean salience avg/std:
- mean delta (c/t/n):
- llm fallback turns total:

## Appendix B: Raw Data References
- API queries used:
- JSON artifact path:
- Any manual cleaning assumptions:
