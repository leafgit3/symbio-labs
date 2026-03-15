import { Agent, DecisionStance } from "@/lib/schemas";
import { AgentTurnResult } from "@/lib/simulation/agentLoop";

export type StanceCounts = Record<DecisionStance, number>;

export type TurnRecord = {
  agent: Agent;
  turn: AgentTurnResult;
};

export type EnforcedTurnRecord = TurnRecord & {
  effectiveStance: DecisionStance;
  stanceSource: "organic" | "orchestrator_fallback";
  fallbackReason?: string;
};

export type ForcedSlot = {
  agentId: string;
  agentName: string;
  from: DecisionStance;
  to: DecisionStance;
  reason: string;
};

export type DecisionSlotResult = {
  records: EnforcedTurnRecord[];
  organicCounts: StanceCounts;
  effectiveCounts: StanceCounts;
  forcedSlots: ForcedSlot[];
};

const STANCE_ORDER: DecisionStance[] = ["escalate", "contain", "monitor"];

function emptyStanceCounts(): StanceCounts {
  return {
    escalate: 0,
    contain: 0,
    monitor: 0,
  };
}

function countStances(items: Array<{ stance: DecisionStance }>): StanceCounts {
  const counts = emptyStanceCounts();

  for (const item of items) {
    counts[item.stance] += 1;
  }

  return counts;
}

function scoreAgentForStance(agent: Agent, target: DecisionStance): number {
  const bag = `${agent.role} ${agent.goals.join(" ")} ${agent.traits.join(" ")}`.toLowerCase();

  const keywords: Record<DecisionStance, string[]> = {
    escalate: ["escalat", "surface", "rumor", "signal", "pressure", "alert", "alarm"],
    contain: ["contain", "stabil", "coordinator", "continuity", "guard", "moderate"],
    monitor: ["monitor", "audit", "skeptic", "evidence", "review", "observe", "translator"],
  };

  return keywords[target].reduce((score, token) => (bag.includes(token) ? score + 1 : score), 0);
}

function pickFallbackCandidate(args: {
  records: EnforcedTurnRecord[];
  target: DecisionStance;
  usedAgentIds: Set<string>;
}): EnforcedTurnRecord {
  const available = args.records.filter((record) => !args.usedAgentIds.has(record.agent.id));
  const source = available.length ? available : args.records;

  return [...source].sort((a, b) => {
    const scoreA = scoreAgentForStance(a.agent, args.target);
    const scoreB = scoreAgentForStance(b.agent, args.target);
    if (scoreA !== scoreB) {
      return scoreB - scoreA;
    }

    const confidenceA = a.turn.confidence ?? 0.5;
    const confidenceB = b.turn.confidence ?? 0.5;
    if (confidenceA !== confidenceB) {
      return confidenceA - confidenceB;
    }

    return a.agent.name.localeCompare(b.agent.name);
  })[0];
}

export function enforceDecisionSlots(inputRecords: TurnRecord[]): DecisionSlotResult {
  const records: EnforcedTurnRecord[] = inputRecords.map((record) => ({
    ...record,
    effectiveStance: record.turn.stance,
    stanceSource: "organic",
  }));

  const organicCounts = countStances(records.map((record) => ({ stance: record.turn.stance })));
  const missing = STANCE_ORDER.filter((stance) => organicCounts[stance] === 0);

  const forcedSlots: ForcedSlot[] = [];
  const usedAgentIds = new Set<string>();

  for (const target of missing) {
    const selected = pickFallbackCandidate({
      records,
      target,
      usedAgentIds,
    });

    usedAgentIds.add(selected.agent.id);

    const from = selected.effectiveStance;
    selected.effectiveStance = target;
    selected.stanceSource = "orchestrator_fallback";
    selected.fallbackReason = `Missing required ${target} stance slot.`;

    forcedSlots.push({
      agentId: selected.agent.id,
      agentName: selected.agent.name,
      from,
      to: target,
      reason: selected.fallbackReason,
    });
  }

  const effectiveCounts = countStances(records.map((record) => ({ stance: record.effectiveStance })));

  return {
    records,
    organicCounts,
    effectiveCounts,
    forcedSlots,
  };
}
