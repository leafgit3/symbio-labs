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
};

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

export function buildPromotedEvents(input: PromotionInput): string[] {
  const events: string[] = [];

  const imbalance = imbalanceLabel(input.stanceCounts);
  if (imbalance) {
    events.push(imbalance);
  }

  if (input.delta.noise >= 2.5 && input.delta.trust <= -1) {
    events.push("Noise-trust divergence: rising chatter is reducing trust.");
  }

  if (monitorMajority(input.stanceCounts, input.totalAgents) && input.delta.noise >= 1.5) {
    events.push("Monitor-majority under rising noise indicates unresolved conflict risk.");
  }

  if (input.forcedSlotsCount > 0) {
    events.push(`Decision-slot fallback applied for ${input.forcedSlotsCount} missing stance slot(s).`);
  }

  return Array.from(new Set(events)).slice(0, 3);
}
