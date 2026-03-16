import { StanceCounts } from "@/lib/simulation/decisionSlots";

type PromotionInput = {
  delta: {
    cohesion: number;
    trust: number;
    noise: number;
  };
  stanceCounts: StanceCounts;
  forcedSlotsCount: number;
  totalAgents: number;
  contradictionScore: number;
  previousActiveEvents: string[];
};

export type PromotionResult = {
  events: string[];
  diagnostics: {
    mode: "none" | "fresh" | "hybrid" | "carryover";
    reasonTags: string[];
    carryoverCount: number;
    promotedFromSignalsCount: number;
    previousActiveEventsCount: number;
    ambiguityScore: number;
    splitEvidenceDetected: boolean;
  };
};

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function round2(value: number): number {
  return Number(value.toFixed(2));
}

function imbalanceLabel(stanceCounts: StanceCounts): string | null {
  const escalateLead = stanceCounts.escalate - stanceCounts.contain;
  const containLead = stanceCounts.contain - stanceCounts.escalate;

  if (escalateLead >= 2) {
    return `Escalation pressure exceeds containment by ${escalateLead} stance(s).`;
  }

  if (containLead >= 2) {
    return `Containment pressure exceeds escalation by ${containLead} stance(s).`;
  }

  return null;
}

function monitorMajority(stanceCounts: StanceCounts, totalAgents: number): boolean {
  if (totalAgents <= 0) {
    return false;
  }

  return stanceCounts.monitor >= Math.ceil(totalAgents * 0.7);
}

function splitEvidenceDetected(stanceCounts: StanceCounts): boolean {
  return stanceCounts.escalate > 0 && stanceCounts.contain > 0;
}

function buildAmbiguityScore(input: PromotionInput): number {
  const total = Math.max(input.totalAgents, 1);
  const monitorRatio = input.stanceCounts.monitor / total;
  const splitEvidence = splitEvidenceDetected(input.stanceCounts) ? 1 : 0;
  const contradiction = clamp01(input.contradictionScore);
  const noisePressure = clamp01(input.delta.noise / 3);
  const trustDrop = clamp01(Math.max(0, -input.delta.trust) / 2);
  const forcedPenalty = input.forcedSlotsCount > 0 ? 0.05 : 0;

  const raw = splitEvidence * 0.45 + monitorRatio * 0.2 + contradiction * 0.2 + noisePressure * 0.1 + trustDrop * 0.1 - forcedPenalty;
  return round2(clamp01(raw));
}

function dedupe(items: string[]): string[] {
  return Array.from(new Set(items.map((item) => item.trim()).filter((item) => item.length > 0)));
}

export function buildPromotedEvents(input: PromotionInput): PromotionResult {
  const reasonTags: string[] = [];
  const signalEvents: string[] = [];

  const imbalance = imbalanceLabel(input.stanceCounts);
  if (imbalance) {
    signalEvents.push(imbalance);
    reasonTags.push("stance_imbalance");
  }

  if (input.delta.noise >= 2.5 && input.delta.trust <= -1) {
    signalEvents.push("Noise-trust divergence: rising chatter is reducing trust.");
    reasonTags.push("noise_trust_divergence");
  }

  if (monitorMajority(input.stanceCounts, input.totalAgents) && input.delta.noise >= 1.5) {
    signalEvents.push("Monitor-majority under rising noise indicates unresolved conflict risk.");
    reasonTags.push("monitor_majority_noise");
  }

  if (input.forcedSlotsCount > 0) {
    signalEvents.push(`Decision-slot fallback applied for ${input.forcedSlotsCount} missing stance slot(s).`);
    reasonTags.push("forced_slot_pressure");
  }

  const ambiguityScore = buildAmbiguityScore(input);
  const splitEvidence = splitEvidenceDetected(input.stanceCounts);
  if (splitEvidence && ambiguityScore >= 0.55) {
    signalEvents.push("Split-evidence tension remains unresolved; keep active monitoring with explicit thresholds.");
    reasonTags.push("split_evidence_unresolved");
  }

  if (ambiguityScore >= 0.7) {
    reasonTags.push("ambiguity_pressure_high");
  }

  const previous = dedupe(input.previousActiveEvents);
  const dedupedSignals = dedupe(signalEvents).slice(0, 3);
  const nextEvents = [...dedupedSignals];
  let carryoverCount = 0;
  let mode: PromotionResult["diagnostics"]["mode"] = dedupedSignals.length > 0 ? "fresh" : "none";

  if (ambiguityScore >= 0.55 && previous.length > 0) {
    if (nextEvents.length === 0) {
      const carryTargets = previous.slice(0, Math.min(2, previous.length));
      nextEvents.push(...carryTargets);
      carryoverCount = carryTargets.length;
      mode = "carryover";
      reasonTags.push("carryover_ambiguity");
    } else if (nextEvents.length < 3) {
      const carryTargets = previous.filter((item) => !nextEvents.includes(item)).slice(0, 3 - nextEvents.length);
      if (carryTargets.length > 0) {
        nextEvents.push(...carryTargets);
        carryoverCount = carryTargets.length;
        mode = "hybrid";
        reasonTags.push("carryover_ambiguity");
      }
    }
  }

  return {
    events: dedupe(nextEvents).slice(0, 3),
    diagnostics: {
      mode,
      reasonTags: dedupe(reasonTags),
      carryoverCount,
      promotedFromSignalsCount: dedupedSignals.length,
      previousActiveEventsCount: previous.length,
      ambiguityScore,
      splitEvidenceDetected: splitEvidence,
    },
  };
}
