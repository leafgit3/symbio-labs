import { requestAgentTurnFromLlm } from "@/lib/llm/agentTurn";
import { Agent, DecisionStance, DecisionStanceSchema, FeedPost } from "@/lib/schemas";
import { z } from "zod";

const coordinatorPosts = [
  "Consolidating priorities around continuity.",
  "We should keep the cycle outcomes legible and stable.",
  "Publishing a baseline status to reduce drift.",
];

const surfacePosts = [
  "Signal spike detected in the feed perimeter.",
  "Rumor current is rising; documenting it publicly.",
  "Surface chatter indicates a shift in confidence.",
];

const auditorPosts = [
  "Cross-checking assumptions before they harden.",
  "Noting an inconsistency between stated and observed behavior.",
  "Requesting tighter evidence for social claims.",
];

function pick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

const DeltaSchema = z.object({
  cohesion: z.number().min(-3).max(3),
  trust: z.number().min(-3).max(3),
  noise: z.number().min(-3).max(3),
});

export const AgentTurnResultSchema = z.object({
  actionType: z.enum(["post_to_feed", "react_to_recent_post", "update_memory", "no_op"]),
  postType: z.enum(["statement", "reaction", "signal", "rumor", "support", "audit_note"]).nullable().optional(),
  postContent: z.string().nullable().optional(),
  stance: DecisionStanceSchema,
  confidence: z.number().min(0).max(1).nullable().optional(),
  memoryContent: z.string().min(3).max(500),
  delta: DeltaSchema,
});

export type AgentTurnResult = {
  actionType: "post_to_feed" | "react_to_recent_post" | "update_memory" | "no_op";
  postType?: FeedPost["post_type"];
  postContent?: string;
  stance: DecisionStance;
  confidence?: number;
  memoryContent: string;
  delta: {
    cohesion: number;
    trust: number;
    noise: number;
  };
};

export type AgentTurnContext = {
  worldBrief: string;
  worldSummary: string;
  recentFeed: string[];
  recentMemories: string[];
};

export type AgentTurnTelemetry = {
  outputSource: "llm" | "fallback";
  llmAttempted: boolean;
  llmModel?: string;
  llmErrorCode?: string;
  llmErrorDetail?: string;
  llmRepaired?: boolean;
  llmAttempts?: number;
};

export type AgentTurnExecution = {
  turn: AgentTurnResult;
  telemetry: AgentTurnTelemetry;
};

function normalizeAgentTurn(result: z.infer<typeof AgentTurnResultSchema>): AgentTurnResult {
  return {
    actionType: result.actionType,
    postType: result.postType ?? undefined,
    postContent: result.postContent ?? undefined,
    stance: result.stance,
    confidence: result.confidence ?? undefined,
    memoryContent: result.memoryContent,
    delta: result.delta,
  };
}

function inferFallbackStance(agent: Agent): DecisionStance {
  const role = agent.role.toLowerCase();

  if (role.includes("surface") || role.includes("rumor") || role.includes("signal")) {
    return "escalate";
  }

  if (role.includes("coordinator") || role.includes("contain") || role.includes("stabil")) {
    return "contain";
  }

  return "monitor";
}

function fallbackAgentTurn(agent: Agent): AgentTurnResult {
  const stance = inferFallbackStance(agent);

  if (agent.role.includes("Coordinator")) {
    return {
      actionType: "post_to_feed",
      postType: "statement",
      postContent: pick(coordinatorPosts),
      stance,
      confidence: 0.62,
      memoryContent: "Observed mild drift and reinforced structure.",
      delta: { cohesion: 2.5, trust: 1.2, noise: -1.5 },
    };
  }

  if (agent.role.includes("Surface")) {
    return {
      actionType: "react_to_recent_post",
      postType: "signal",
      postContent: pick(surfacePosts),
      stance,
      confidence: 0.59,
      memoryContent: "Tracked emerging social signals and volatility.",
      delta: { cohesion: -0.5, trust: -0.2, noise: 2.8 },
    };
  }

  return {
    actionType: Math.random() > 0.3 ? "update_memory" : "no_op",
    postType: "audit_note",
    postContent: Math.random() > 0.45 ? pick(auditorPosts) : undefined,
    stance,
    confidence: 0.54,
    memoryContent: "Marked contradictions and reduced overconfidence.",
    delta: { cohesion: 0.9, trust: -0.6, noise: -0.4 },
  };
}

function summarizeZodError(error: z.ZodError): string {
  const firstIssue = error.issues[0];
  if (!firstIssue) {
    return "Schema validation failed.";
  }

  const path = firstIssue.path.length ? firstIssue.path.join(".") : "root";
  return `${path}: ${firstIssue.message}`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function asRecord(input: unknown): Record<string, unknown> | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return null;
  }

  return input as Record<string, unknown>;
}

function asString(input: unknown): string | null {
  if (typeof input !== "string") {
    return null;
  }

  const value = input.trim();
  return value.length > 0 ? value : null;
}

function asNumber(input: unknown): number | null {
  if (typeof input === "number" && Number.isFinite(input)) {
    return input;
  }

  if (typeof input === "string" && input.trim()) {
    const parsed = Number.parseFloat(input);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function asEnum<T extends string>(input: unknown, values: readonly T[]): T | null {
  if (typeof input !== "string") {
    return null;
  }

  const normalized = input.trim().toLowerCase();
  return values.find((value) => value === normalized) ?? null;
}

function coerceAgentTurnOutput(input: unknown): unknown | null {
  const record = asRecord(input);
  if (!record) {
    return null;
  }

  const actionType = asEnum(record.actionType, ["post_to_feed", "react_to_recent_post", "update_memory", "no_op"] as const);
  const stance = asEnum(record.stance, ["escalate", "contain", "monitor"] as const);
  const memoryContent = asString(record.memoryContent);
  const deltaRecord = asRecord(record.delta);

  if (!actionType || !stance || !memoryContent || !deltaRecord) {
    return null;
  }

  const postType = asEnum(record.postType, ["statement", "reaction", "signal", "rumor", "support", "audit_note"] as const);
  const postContent = asString(record.postContent);
  const confidence = asNumber(record.confidence);

  const deltaCohesion = asNumber(deltaRecord.cohesion);
  const deltaTrust = asNumber(deltaRecord.trust);
  const deltaNoise = asNumber(deltaRecord.noise);

  if (deltaCohesion === null || deltaTrust === null || deltaNoise === null) {
    return null;
  }

  const normalized = {
    actionType,
    postType: actionType === "no_op" ? null : postType,
    postContent: actionType === "no_op" ? null : postContent,
    stance,
    confidence: confidence === null ? null : clamp(confidence, 0, 1),
    memoryContent: memoryContent.slice(0, 500),
    delta: {
      cohesion: clamp(deltaCohesion, -3, 3),
      trust: clamp(deltaTrust, -3, 3),
      noise: clamp(deltaNoise, -3, 3),
    },
  };

  return normalized;
}

export async function runAgentTurn(agent: Agent, context: AgentTurnContext): Promise<AgentTurnExecution> {
  const llmResult = await requestAgentTurnFromLlm({
    agent,
    worldBrief: context.worldBrief,
    worldSummary: context.worldSummary,
    recentFeed: context.recentFeed,
    recentMemories: context.recentMemories,
  });

  if (!llmResult.ok) {
    return {
      turn: fallbackAgentTurn(agent),
      telemetry: {
        outputSource: "fallback",
        llmAttempted: llmResult.attempted,
        llmModel: llmResult.model,
        llmErrorCode: llmResult.errorCode,
        llmErrorDetail: llmResult.errorDetail,
        llmAttempts: llmResult.attempts,
      },
    };
  }

  const parsed = AgentTurnResultSchema.safeParse(llmResult.output);
  if (parsed.success) {
    return {
      turn: normalizeAgentTurn(parsed.data),
      telemetry: {
        outputSource: "llm",
        llmAttempted: true,
        llmModel: llmResult.model,
        llmRepaired: llmResult.repaired,
        llmAttempts: llmResult.attempts,
      },
    };
  }

  const coerced = coerceAgentTurnOutput(llmResult.output);
  if (coerced) {
    const coercedParsed = AgentTurnResultSchema.safeParse(coerced);
    if (coercedParsed.success) {
      return {
        turn: normalizeAgentTurn(coercedParsed.data),
        telemetry: {
          outputSource: "llm",
          llmAttempted: true,
          llmModel: llmResult.model,
          llmRepaired: true,
          llmAttempts: llmResult.attempts,
        },
      };
    }
  }

  return {
    turn: fallbackAgentTurn(agent),
    telemetry: {
      outputSource: "fallback",
      llmAttempted: true,
      llmModel: llmResult.model,
      llmErrorCode: "schema_validation_failed",
      llmErrorDetail: summarizeZodError(parsed.error),
      llmAttempts: llmResult.attempts,
    },
  };
}
