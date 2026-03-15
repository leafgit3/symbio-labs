import { AgentTurnResult } from "@/lib/simulation/agentLoop";

type SalienceInput = {
  turn: AgentTurnResult;
  memoryContent: string;
  postContent?: string;
  recentFeed: string[];
  recentMemories: string[];
};

const THRESHOLD_KEYWORDS = [
  "threshold",
  "evidence",
  "escalate",
  "contain",
  "promotion",
  "active event",
  "manipulation",
  "coercion",
  "contradiction",
  "mismatch",
  "risk",
  "unresolved",
];

const CONTRADICTION_CUES = [
  "but",
  "however",
  "despite",
  "conflict",
  "mismatch",
  "contradict",
  "unclear",
  "uneven",
  "yet",
  "although",
];

function normalize(input: string): string[] {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3);
}

function tokenOverlap(a: string, b: string): number {
  const aTokens = new Set(normalize(a));
  const bTokens = new Set(normalize(b));

  if (!aTokens.size || !bTokens.size) {
    return 0;
  }

  let intersection = 0;
  for (const token of aTokens) {
    if (bTokens.has(token)) {
      intersection += 1;
    }
  }

  const union = aTokens.size + bTokens.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function maxOverlap(base: string, candidates: string[]): number {
  if (!candidates.length) {
    return 0;
  }

  return candidates.reduce((maxValue, candidate) => Math.max(maxValue, tokenOverlap(base, candidate)), 0);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function includesKeyword(text: string, keyword: string): boolean {
  if (keyword.includes(" ")) {
    return text.includes(keyword);
  }

  const tokens = new Set(normalize(text));
  return tokens.has(keyword);
}

export function computeMemorySalience(input: SalienceInput): number {
  const memory = input.memoryContent.trim();
  if (!memory) {
    return 0.2;
  }

  const novelty = 1 - maxOverlap(memory, input.recentMemories);
  const feedContradiction = 1 - maxOverlap(memory, input.recentFeed);
  const postMismatch = input.postContent ? 1 - tokenOverlap(memory, input.postContent) : 0.35;

  const memoryLower = memory.toLowerCase();
  const thresholdHits = THRESHOLD_KEYWORDS.reduce(
    (count, keyword) => count + (includesKeyword(memoryLower, keyword) ? 1 : 0),
    0,
  );
  const thresholdRelevance = thresholdHits === 0 ? 0 : clamp(thresholdHits / 4, 0, 1);

  const contradictionHits = CONTRADICTION_CUES.reduce(
    (count, keyword) => count + (includesKeyword(memoryLower, keyword) ? 1 : 0),
    0,
  );
  const contradictionSignal = contradictionHits === 0 ? 0 : clamp(contradictionHits / 3, 0, 1);

  const stancePressure = input.turn.stance === "monitor" ? 0 : 0.06;
  const noOpPenalty = input.turn.actionType === "no_op" ? -0.08 : 0;

  const raw =
    0.3 +
    novelty * 0.22 +
    feedContradiction * 0.2 +
    postMismatch * 0.18 +
    thresholdRelevance * 0.16 +
    contradictionSignal * 0.14 +
    stancePressure +
    noOpPenalty;

  return Number(clamp(raw, 0.2, 0.95).toFixed(2));
}
