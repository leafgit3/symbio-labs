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
      },
    };
  }

  const parsed = AgentTurnResultSchema.safeParse(llmResult.output);
  if (!parsed.success) {
    return {
      turn: fallbackAgentTurn(agent),
      telemetry: {
        outputSource: "fallback",
        llmAttempted: true,
        llmModel: llmResult.model,
        llmErrorCode: "schema_validation_failed",
        llmErrorDetail: summarizeZodError(parsed.error),
      },
    };
  }

  return {
    turn: normalizeAgentTurn(parsed.data),
    telemetry: {
      outputSource: "llm",
      llmAttempted: true,
      llmModel: llmResult.model,
    },
  };
}
