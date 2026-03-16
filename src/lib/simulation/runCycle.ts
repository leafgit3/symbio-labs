import { getOrCreateSimulationContext } from "@/lib/db/simulationContext";
import { getSupabaseServiceClient } from "@/lib/db/supabase";
import { mutateStore } from "@/lib/db/store";
import { buildEvent } from "@/lib/events/eventBuilder";
import {
  Agent,
  AgentMemorySchema,
  CycleRun,
  CycleRunSchema,
  DecisionStance,
  FeedPostSchema,
  RunCycleInput,
  RunSummary,
  RunSummarySchema,
  WorldState,
  WorldStateSchema,
} from "@/lib/schemas";
import { AgentTurnResult, AgentTurnTelemetry, runAgentTurn } from "@/lib/simulation/agentLoop";
import { enforceDecisionSlots, StanceCounts } from "@/lib/simulation/decisionSlots";
import { buildPromotedEvents } from "@/lib/simulation/eventPromotion";
import { computeMemorySalience } from "@/lib/simulation/salience";
import { buildWorldStateUpdate } from "@/lib/world/worldUpdate";

export type RunCycleResult = {
  cycleRun: CycleRun;
  worldState: WorldState;
  runSummary: RunSummary;
};

function applyAgentOverride(agent: Agent, input: RunCycleInput): Agent {
  const override = input.agentOverrides?.find((item) => item.agentId === agent.id);

  if (!override) {
    return agent;
  }

  return {
    ...agent,
    role: override.role ?? agent.role,
    goals: override.goals ?? agent.goals,
    traits: override.traits ?? agent.traits,
  };
}

function round1(value: number): number {
  return Number(value.toFixed(1));
}

function round2(value: number): number {
  return Number(value.toFixed(2));
}

function toIso(value: string | null): string | null {
  if (!value) {
    return null;
  }

  return new Date(value).toISOString();
}

type ExecutedTurn = {
  agent: Agent;
  turn: AgentTurnResult;
  telemetry: AgentTurnTelemetry;
};

type RoleDriftPair = {
  agentAId: string;
  agentAName: string;
  agentBId: string;
  agentBName: string;
  overlap: number;
};

type RoleDriftAgent = {
  id: string;
  name: string;
  maxOverlap: number;
};

type AggregateDelta = {
  cohesion: number;
  trust: number;
  noise: number;
};

type StanceGuidance = {
  mode: "none" | "soft" | "targeted";
  target?: DecisionStance;
  missing: DecisionStance[];
  message?: string;
};

const STANCE_ORDER: DecisionStance[] = ["escalate", "contain", "monitor"];

function truncate(value: string | undefined, maxLength = 220): string | undefined {
  if (!value) {
    return undefined;
  }

  return value.length <= maxLength ? value : `${value.slice(0, maxLength - 3)}...`;
}

function tokenOverlap(a: string, b: string): number {
  const normalize = (input: string) =>
    input
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .map((token) => token.trim())
      .filter((token) => token.length >= 3);

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

function normalizedStanceEntropy(counts: StanceCounts): number {
  const total = counts.escalate + counts.contain + counts.monitor;
  if (total <= 0) {
    return 0;
  }

  const parts = [counts.escalate, counts.contain, counts.monitor]
    .map((value) => value / total)
    .filter((value) => value > 0);

  const entropy = -parts.reduce((sum, p) => sum + p * Math.log(p), 0);
  const maxEntropy = Math.log(3);
  return maxEntropy <= 0 ? 0 : entropy / maxEntropy;
}

function buildContradictionScore(args: {
  turns: ExecutedTurn[];
  effectiveStanceCounts: StanceCounts;
  forcedSlotsCount: number;
}): number {
  const mismatches = args.turns
    .filter((item) => Boolean(item.turn.postContent))
    .map((item) => 1 - tokenOverlap(item.turn.memoryContent, item.turn.postContent ?? ""));

  const mismatchAvg =
    mismatches.length > 0 ? mismatches.reduce((sum, value) => sum + value, 0) / mismatches.length : 0.35;
  const entropy = normalizedStanceEntropy(args.effectiveStanceCounts);
  const forcedFactor = Math.min(args.forcedSlotsCount / 2, 1);

  const raw = mismatchAvg * 0.55 + entropy * 0.35 + forcedFactor * 0.1;
  return round2(Math.min(1, Math.max(0, raw)));
}

function buildRoleDriftDiagnostics(turns: ExecutedTurn[]): {
  meanOverlap: number;
  maxOverlap: number;
  highPairCount: number;
  topPairs: RoleDriftPair[];
  flaggedAgents: RoleDriftAgent[];
} {
  if (turns.length < 2) {
    return {
      meanOverlap: 0,
      maxOverlap: 0,
      highPairCount: 0,
      topPairs: [],
      flaggedAgents: [],
    };
  }

  const snippets = turns.map((item) => ({
    id: item.agent.id,
    name: item.agent.name,
    text: `${item.turn.memoryContent} ${item.turn.postContent ?? ""}`.trim(),
  }));

  const nearest = new Map<string, RoleDriftAgent>();
  for (const snippet of snippets) {
    nearest.set(snippet.id, { id: snippet.id, name: snippet.name, maxOverlap: 0 });
  }

  let pairCount = 0;
  let overlapSum = 0;
  let maxOverlap = 0;
  let highPairCount = 0;
  const pairs: RoleDriftPair[] = [];

  for (let i = 0; i < snippets.length; i += 1) {
    for (let j = i + 1; j < snippets.length; j += 1) {
      const a = snippets[i];
      const b = snippets[j];
      const overlap = round2(tokenOverlap(a.text, b.text));

      pairs.push({
        agentAId: a.id,
        agentAName: a.name,
        agentBId: b.id,
        agentBName: b.name,
        overlap,
      });

      pairCount += 1;
      overlapSum += overlap;
      maxOverlap = Math.max(maxOverlap, overlap);
      if (overlap >= 0.55) {
        highPairCount += 1;
      }

      const nearestA = nearest.get(a.id);
      if (nearestA && overlap > nearestA.maxOverlap) {
        nearestA.maxOverlap = overlap;
      }
      const nearestB = nearest.get(b.id);
      if (nearestB && overlap > nearestB.maxOverlap) {
        nearestB.maxOverlap = overlap;
      }
    }
  }

  return {
    meanOverlap: round2(pairCount > 0 ? overlapSum / pairCount : 0),
    maxOverlap: round2(maxOverlap),
    highPairCount,
    topPairs: pairs.sort((a, b) => b.overlap - a.overlap).slice(0, 3),
    flaggedAgents: Array.from(nearest.values())
      .filter((agent) => agent.maxOverlap >= 0.55)
      .sort((a, b) => b.maxOverlap - a.maxOverlap),
  };
}

function avg(values: number[]): number {
  if (!values.length) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function stdDev(values: number[], mean: number): number {
  if (!values.length) {
    return 0;
  }

  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function clampDelta(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function applyTrustNoiseEnvelope(args: {
  rawDelta: AggregateDelta;
  previousWorld: WorldState;
  cycleNumber: number;
}): {
  adjustedDelta: AggregateDelta;
  diagnostics: {
    envelopeApplied: boolean;
    trustDeltaRaw: number;
    trustDeltaAdjusted: number;
    noiseDeltaRaw: number;
    noiseDeltaAdjusted: number;
    trustClamp: number;
    noiseClamp: number;
    dampingFactor: number;
  };
} {
  const stageFactor = args.cycleNumber <= 2 ? 0.65 : args.cycleNumber <= 5 ? 0.8 : 1;
  const trustClamp = round2(2.8 * stageFactor);
  const noiseClamp = round2(3.2 * stageFactor);

  const trustRaw = round2(args.rawDelta.trust);
  const noiseRaw = round2(args.rawDelta.noise);

  let trustAdjusted = clampDelta(trustRaw, -trustClamp, trustClamp);
  let noiseAdjusted = clampDelta(noiseRaw, -noiseClamp, noiseClamp);
  let dampingFactor = 1;

  if (noiseAdjusted > 1.5 && trustAdjusted < -1) {
    const pressure = clampDelta((noiseAdjusted - 1.5) / 2.5, 0, 1);
    const damp = round2(0.15 + pressure * 0.25);
    trustAdjusted = trustAdjusted * (1 - damp);
    dampingFactor = round2(dampingFactor - damp);
  }

  if (args.previousWorld.trust <= 25 && trustAdjusted < 0) {
    trustAdjusted = trustAdjusted * 0.75;
    dampingFactor = round2(dampingFactor * 0.75);
  }

  trustAdjusted = round1(trustAdjusted);
  noiseAdjusted = round1(noiseAdjusted);

  return {
    adjustedDelta: {
      cohesion: args.rawDelta.cohesion,
      trust: trustAdjusted,
      noise: noiseAdjusted,
    },
    diagnostics: {
      envelopeApplied: trustAdjusted !== round1(trustRaw) || noiseAdjusted !== round1(noiseRaw),
      trustDeltaRaw: round1(trustRaw),
      trustDeltaAdjusted: trustAdjusted,
      noiseDeltaRaw: round1(noiseRaw),
      noiseDeltaAdjusted: noiseAdjusted,
      trustClamp,
      noiseClamp,
      dampingFactor,
    },
  };
}

function emptyStanceCounts(): StanceCounts {
  return {
    escalate: 0,
    contain: 0,
    monitor: 0,
  };
}

function countOrganicStances(turns: ExecutedTurn[]): StanceCounts {
  const counts = emptyStanceCounts();
  for (const item of turns) {
    counts[item.turn.stance] += 1;
  }

  return counts;
}

function scoreAgentForGuidance(agent: Agent, target: DecisionStance, scenarioLabel: string): number {
  const bag = `${agent.role} ${agent.goals.join(" ")} ${agent.traits.join(" ")} ${scenarioLabel}`.toLowerCase();

  const roleKeywords: Record<DecisionStance, string[]> = {
    escalate: ["surface", "rumor", "signal", "escalat", "pressure", "alert", "amplify"],
    contain: ["contain", "coordinator", "stabil", "moderate", "guard", "continuity"],
    monitor: ["monitor", "audit", "skeptic", "evidence", "translator", "observe", "review"],
  };

  return roleKeywords[target].reduce((score, token) => (bag.includes(token) ? score + 1 : score), 0);
}

function pickGuidanceTarget(args: {
  agent: Agent;
  missing: DecisionStance[];
  scenarioLabel: string;
}): DecisionStance {
  return [...args.missing].sort((a, b) => {
    const scoreA = scoreAgentForGuidance(args.agent, a, args.scenarioLabel);
    const scoreB = scoreAgentForGuidance(args.agent, b, args.scenarioLabel);
    if (scoreA !== scoreB) {
      return scoreB - scoreA;
    }

    return STANCE_ORDER.indexOf(a) - STANCE_ORDER.indexOf(b);
  })[0];
}

function buildStanceGuidance(args: {
  agent: Agent;
  executedTurns: ExecutedTurn[];
  totalAgents: number;
  scenarioLabel: string;
}): StanceGuidance {
  const organicCounts = countOrganicStances(args.executedTurns);
  const missing = STANCE_ORDER.filter((stance) => organicCounts[stance] === 0);

  if (!missing.length) {
    return {
      mode: "none",
      missing,
    };
  }

  const remainingAgents = Math.max(0, args.totalAgents - args.executedTurns.length);
  const mode: StanceGuidance["mode"] = remainingAgents <= missing.length + 1 ? "targeted" : "soft";
  const target = pickGuidanceTarget({
    agent: args.agent,
    missing,
    scenarioLabel: args.scenarioLabel,
  });

  if (mode === "targeted") {
    return {
      mode,
      target,
      missing,
      message: `Cycle guardrail: missing stances ${missing.join(", ")}. For this turn prefer stance=\"${target}\" to preserve diversity coverage.`,
    };
  }

  return {
    mode,
    target,
    missing,
    message: `Cycle currently lacks stances ${missing.join(", ")}. If evidence allows, prefer stance=\"${target}\" while staying role-consistent.`,
  };
}

export async function runCycle(input: RunCycleInput = {}): Promise<RunCycleResult> {
  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    return runCycleInMemory(input);
  }

  const context = await getOrCreateSimulationContext();
  const sessionId = context.sessionId;

  const previousWorldResult = await supabase
    .from("world_state")
    .select("*")
    .eq("session_id", sessionId)
    .order("cycle_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (previousWorldResult.error || !previousWorldResult.data) {
    throw new Error(`Missing world_state seed: ${previousWorldResult.error?.message ?? "unknown"}`);
  }

  const previousWorld = WorldStateSchema.parse({
    ...previousWorldResult.data,
    active_events: Array.isArray(previousWorldResult.data.active_events)
      ? previousWorldResult.data.active_events.map((item: unknown) => String(item))
      : [],
    created_at: new Date(previousWorldResult.data.created_at).toISOString(),
    updated_at: new Date(previousWorldResult.data.updated_at).toISOString(),
  });

  const agentsResult = await supabase.from("agents").select("*").order("name", { ascending: true });
  if (agentsResult.error || !agentsResult.data) {
    throw new Error(`Failed reading agents: ${agentsResult.error?.message ?? "unknown"}`);
  }

  const agents = agentsResult.data.map((row) =>
    ({
      id: row.id,
      name: row.name,
      role: row.role,
      goals: Array.isArray(row.goals) ? row.goals.map((item: unknown) => String(item)) : [],
      traits: Array.isArray(row.traits) ? row.traits.map((item: unknown) => String(item)) : [],
      status: row.status,
      memory_summary: row.memory_summary,
      last_action_at: toIso(row.last_action_at),
      created_at: new Date(row.created_at).toISOString(),
      updated_at: new Date(row.updated_at).toISOString(),
    }) satisfies Agent,
  );

  const worldBriefStored = context.worldBrief;
  const scenarioLabel = input.scenarioLabel?.trim() || "default";
  const worldBriefUsed = input.worldBrief?.trim() || worldBriefStored;

  const cycleNumber = previousWorld.cycle_number + 1;
  const now = new Date().toISOString();

  const cycleRun = CycleRunSchema.parse({
    id: crypto.randomUUID(),
    cycle_number: cycleNumber,
    status: "running",
    started_at: now,
    finished_at: null,
    summary: `Cycle ${cycleNumber} started (${scenarioLabel}).`,
    created_at: now,
  });

  const { error: cycleInsertError } = await supabase.from("cycle_runs").insert({
    id: cycleRun.id,
    session_id: sessionId,
    cycle_number: cycleRun.cycle_number,
    status: cycleRun.status,
    started_at: cycleRun.started_at,
    finished_at: cycleRun.finished_at,
    summary: cycleRun.summary,
    created_at: cycleRun.created_at,
  });

  if (cycleInsertError) {
    throw new Error(`Failed inserting cycle_run: ${cycleInsertError.message}`);
  }

  const agentsUsed = agents.map((agent) => applyAgentOverride(agent, input));

  await supabase.from("event_logs").insert({
    id: crypto.randomUUID(),
    session_id: sessionId,
    cycle_number: cycleNumber,
    event_type: "cycle_started",
    source_agent_id: null,
    summary: `Cycle ${cycleNumber} started.`,
    payload: {
      scenarioLabel,
      worldBriefUsed,
      agentOverrides: input.agentOverrides ?? [],
      agentsUsed: agentsUsed.map((agent) => ({
        id: agent.id,
        name: agent.name,
        role: agent.role,
        goals: agent.goals,
        traits: agent.traits,
      })),
    },
    created_at: now,
  });

  let delta = { cohesion: 0, trust: 0, noise: 0 };
  let postsCreated = 0;
  const executedTurns: ExecutedTurn[] = [];
  const memorySaliences: number[] = [];
  let llmFallbackCount = 0;
  let llmSuccessCount = 0;
  let llmSchemaRepairCount = 0;
  const llmFallbackReasonCounts: Record<string, number> = {};
  let stanceGuidanceSoftCount = 0;
  let stanceGuidanceTargetedCount = 0;

  for (const effectiveAgent of agentsUsed) {
    const recentFeedResult = await supabase
      .from("feed_posts")
      .select("content, created_at")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: false })
      .limit(8);

    if (recentFeedResult.error) {
      throw new Error(`Failed reading recent feed: ${recentFeedResult.error.message}`);
    }

    const recentMemoriesResult = await supabase
      .from("agent_memories")
      .select("content, created_at")
      .eq("session_id", sessionId)
      .eq("agent_id", effectiveAgent.id)
      .order("created_at", { ascending: false })
      .limit(6);

    if (recentMemoriesResult.error) {
      throw new Error(`Failed reading recent memories: ${recentMemoriesResult.error.message}`);
    }

    const recentFeed = (recentFeedResult.data ?? []).map((row) => row.content);
    const recentMemories = (recentMemoriesResult.data ?? []).map((row) => row.content);

    const stanceGuidance = buildStanceGuidance({
      agent: effectiveAgent,
      executedTurns,
      totalAgents: agentsUsed.length,
      scenarioLabel,
    });

    if (stanceGuidance.mode === "soft") {
      stanceGuidanceSoftCount += 1;
    } else if (stanceGuidance.mode === "targeted") {
      stanceGuidanceTargetedCount += 1;
    }

    const execution = await runAgentTurn(effectiveAgent, {
      worldBrief: worldBriefUsed,
      worldSummary: previousWorld.summary,
      recentFeed,
      recentMemories,
      stanceGuidance: stanceGuidance.message,
    });
    const turn = execution.turn;
    executedTurns.push({
      agent: effectiveAgent,
      turn,
      telemetry: execution.telemetry,
    });

    if (execution.telemetry.outputSource === "fallback") {
      llmFallbackCount += 1;
      const code = execution.telemetry.llmErrorCode ?? "unknown_error";
      llmFallbackReasonCounts[code] = (llmFallbackReasonCounts[code] ?? 0) + 1;
    } else {
      llmSuccessCount += 1;
      if (execution.telemetry.llmRepaired) {
        llmSchemaRepairCount += 1;
      }
    }

    const actionTimestamp = new Date().toISOString();

    delta = {
      cohesion: delta.cohesion + turn.delta.cohesion,
      trust: delta.trust + turn.delta.trust,
      noise: delta.noise + turn.delta.noise,
    };

    await supabase.from("event_logs").insert({
      id: crypto.randomUUID(),
      session_id: sessionId,
      cycle_number: cycleNumber,
      event_type: "agent_action",
      source_agent_id: effectiveAgent.id,
      summary: `${effectiveAgent.name} executed ${turn.actionType}.`,
      payload: {
        ...turn,
        stanceSource: "organic",
        outputSource: execution.telemetry.outputSource,
        llmAttempted: execution.telemetry.llmAttempted,
        llmModel: execution.telemetry.llmModel,
        llmErrorCode: execution.telemetry.llmErrorCode,
        llmErrorDetail: truncate(execution.telemetry.llmErrorDetail),
        llmRepaired: execution.telemetry.llmRepaired ?? false,
        llmAttempts: execution.telemetry.llmAttempts ?? null,
        stanceGuidanceMode: stanceGuidance.mode,
        stanceGuidanceTarget: stanceGuidance.target ?? null,
        stanceGuidanceMissing: stanceGuidance.missing,
        role: effectiveAgent.role,
        goals: effectiveAgent.goals,
        traits: effectiveAgent.traits,
      },
      created_at: actionTimestamp,
    });

    if (execution.telemetry.outputSource === "fallback") {
      await supabase.from("event_logs").insert({
        id: crypto.randomUUID(),
        session_id: sessionId,
        cycle_number: cycleNumber,
        event_type: "minor_event_created",
        source_agent_id: effectiveAgent.id,
        summary: `${effectiveAgent.name} used local fallback (${execution.telemetry.llmErrorCode ?? "unknown_error"}).`,
        payload: {
          kind: "llm_fallback",
          outputSource: execution.telemetry.outputSource,
          llmAttempted: execution.telemetry.llmAttempted,
          llmModel: execution.telemetry.llmModel,
          llmErrorCode: execution.telemetry.llmErrorCode,
          llmErrorDetail: truncate(execution.telemetry.llmErrorDetail),
          llmAttempts: execution.telemetry.llmAttempts ?? null,
          actionType: turn.actionType,
          stance: turn.stance,
          confidence: turn.confidence ?? null,
        },
        created_at: actionTimestamp,
      });
    }

    if (turn.postContent && turn.postType) {
      postsCreated += 1;

      await supabase.from("feed_posts").insert({
        id: crypto.randomUUID(),
        session_id: sessionId,
        cycle_number: cycleNumber,
        agent_id: effectiveAgent.id,
        post_type: turn.postType,
        content: turn.postContent,
        created_at: actionTimestamp,
      });

      await supabase.from("event_logs").insert({
        id: crypto.randomUUID(),
        session_id: sessionId,
        cycle_number: cycleNumber,
        event_type: "feed_post_created",
        source_agent_id: effectiveAgent.id,
        summary: `${effectiveAgent.name} posted to feed.`,
        payload: { post_type: turn.postType },
        created_at: actionTimestamp,
      });
    }

    const salience = computeMemorySalience({
      turn,
      memoryContent: turn.memoryContent,
      postContent: turn.postContent,
      recentFeed,
      recentMemories,
    });
    memorySaliences.push(salience);

    const memoryEntry = AgentMemorySchema.parse({
      id: crypto.randomUUID(),
      agent_id: effectiveAgent.id,
      memory_type: "observation",
      content: turn.memoryContent,
      salience,
      created_at: actionTimestamp,
      updated_at: actionTimestamp,
    });

    await supabase.from("agent_memories").insert({
      id: memoryEntry.id,
      session_id: sessionId,
      agent_id: memoryEntry.agent_id,
      memory_type: memoryEntry.memory_type,
      content: memoryEntry.content,
      salience: memoryEntry.salience,
      created_at: memoryEntry.created_at,
      updated_at: memoryEntry.updated_at,
    });

    await supabase.from("event_logs").insert({
      id: crypto.randomUUID(),
      session_id: sessionId,
      cycle_number: cycleNumber,
      event_type: "memory_updated",
      source_agent_id: effectiveAgent.id,
      summary: `${effectiveAgent.name} recorded memory.`,
      payload: { memory_type: memoryEntry.memory_type },
      created_at: actionTimestamp,
    });

    await supabase
      .from("agents")
      .update({
        status: turn.actionType === "no_op" ? "idle" : "active",
        last_action_at: actionTimestamp,
        memory_summary: turn.memoryContent,
        updated_at: actionTimestamp,
      })
      .eq("id", effectiveAgent.id);
  }

  const decisionSlots = enforceDecisionSlots(executedTurns);

  if (decisionSlots.forcedSlots.length > 0) {
    await supabase.from("event_logs").insert({
      id: crypto.randomUUID(),
      session_id: sessionId,
      cycle_number: cycleNumber,
      event_type: "minor_event_created",
      source_agent_id: null,
      summary: `Decision-slot fallback filled ${decisionSlots.forcedSlots.length} missing stance slot(s).`,
      payload: {
        forcedSlotsCount: decisionSlots.forcedSlots.length,
        forcedSlots: decisionSlots.forcedSlots,
        organicStanceCounts: decisionSlots.organicCounts,
        effectiveStanceCounts: decisionSlots.effectiveCounts,
      },
      created_at: new Date().toISOString(),
    });
  }

  const contradictionScore = buildContradictionScore({
    turns: executedTurns,
    effectiveStanceCounts: decisionSlots.effectiveCounts,
    forcedSlotsCount: decisionSlots.forcedSlots.length,
  });
  const roleDrift = buildRoleDriftDiagnostics(executedTurns);
  const envelope = applyTrustNoiseEnvelope({
    rawDelta: delta,
    previousWorld,
    cycleNumber,
  });
  const adjustedDelta = envelope.adjustedDelta;
  const promotion = buildPromotedEvents({
    delta,
    stanceCounts: decisionSlots.effectiveCounts,
    forcedSlotsCount: decisionSlots.forcedSlots.length,
    totalAgents: agentsUsed.length,
    contradictionScore,
    previousActiveEvents: previousWorld.active_events,
  });
  const salienceAvg = round2(avg(memorySaliences));
  const salienceStdDev = round2(stdDev(memorySaliences, salienceAvg));

  const worldState = buildWorldStateUpdate({
    cycleNumber,
    prev: previousWorld,
    delta: adjustedDelta,
    summary: `Cycle ${cycleNumber}: cohesion ${adjustedDelta.cohesion >= 0 ? "+" : ""}${adjustedDelta.cohesion.toFixed(1)}, trust ${adjustedDelta.trust >= 0 ? "+" : ""}${adjustedDelta.trust.toFixed(1)}, noise ${adjustedDelta.noise >= 0 ? "+" : ""}${adjustedDelta.noise.toFixed(1)}.`,
    activeEvents: promotion.events,
  });

  await supabase.from("world_state").insert({
    id: worldState.id,
    session_id: sessionId,
    cycle_number: worldState.cycle_number,
    summary: worldState.summary,
    cohesion: worldState.cohesion,
    trust: worldState.trust,
    noise: worldState.noise,
    active_events: worldState.active_events,
    created_at: worldState.created_at,
    updated_at: worldState.updated_at,
  });

  if (roleDrift.highPairCount > 0) {
    await supabase.from("event_logs").insert({
      id: crypto.randomUUID(),
      session_id: sessionId,
      cycle_number: cycleNumber,
      event_type: "minor_event_created",
      source_agent_id: null,
      summary: `Role drift signal detected (${roleDrift.highPairCount} high-overlap pair${roleDrift.highPairCount === 1 ? "" : "s"}).`,
      payload: {
        kind: "role_drift_signal",
        roleDriftMeanOverlap: roleDrift.meanOverlap,
        roleDriftMaxOverlap: roleDrift.maxOverlap,
        roleDriftHighPairCount: roleDrift.highPairCount,
        roleDriftTopPairs: roleDrift.topPairs,
      },
      created_at: new Date().toISOString(),
    });
  }

  await supabase.from("event_logs").insert({
    id: crypto.randomUUID(),
    session_id: sessionId,
    cycle_number: cycleNumber,
    event_type: "world_state_changed",
    source_agent_id: null,
    summary: `World state updated for cycle ${cycleNumber}.`,
    payload: {
      cohesion: worldState.cohesion,
      trust: worldState.trust,
      noise: worldState.noise,
      promotedEvents: worldState.active_events,
      eventPromotionMode: promotion.diagnostics.mode,
      eventPromotionReasonTags: promotion.diagnostics.reasonTags,
      eventPromotionCarryoverCount: promotion.diagnostics.carryoverCount,
      eventPromotionSignalCount: promotion.diagnostics.promotedFromSignalsCount,
      eventPromotionPreviousCount: promotion.diagnostics.previousActiveEventsCount,
      eventPromotionAmbiguityScore: promotion.diagnostics.ambiguityScore,
      eventPromotionSplitEvidence: promotion.diagnostics.splitEvidenceDetected,
      roleDriftMeanOverlap: roleDrift.meanOverlap,
      roleDriftMaxOverlap: roleDrift.maxOverlap,
      roleDriftHighPairCount: roleDrift.highPairCount,
      roleDriftTopPairs: roleDrift.topPairs,
      roleDriftFlaggedAgents: roleDrift.flaggedAgents,
      envelopeApplied: envelope.diagnostics.envelopeApplied,
      trustDeltaRaw: envelope.diagnostics.trustDeltaRaw,
      trustDeltaAdjusted: envelope.diagnostics.trustDeltaAdjusted,
      noiseDeltaRaw: envelope.diagnostics.noiseDeltaRaw,
      noiseDeltaAdjusted: envelope.diagnostics.noiseDeltaAdjusted,
      envelopeDampingFactor: envelope.diagnostics.dampingFactor,
      trustDeltaClamp: envelope.diagnostics.trustClamp,
      noiseDeltaClamp: envelope.diagnostics.noiseClamp,
      organicStanceCounts: decisionSlots.organicCounts,
      effectiveStanceCounts: decisionSlots.effectiveCounts,
      forcedSlotsCount: decisionSlots.forcedSlots.length,
      contradictionScore,
      salienceAvg,
      salienceStdDev,
      llmFallbackCount,
      llmSuccessCount,
      llmSchemaRepairCount,
      llmFallbackReasonCounts,
      stanceGuidanceSoftCount,
      stanceGuidanceTargetedCount,
      worldBriefUsed,
      scenarioLabel,
    },
    created_at: new Date().toISOString(),
  });

  const runSummary = RunSummarySchema.parse({
    cycleNumber,
    scenarioLabel,
    worldBriefUsed,
    postsCreated,
    delta: {
      cohesion: round1(adjustedDelta.cohesion),
      trust: round1(adjustedDelta.trust),
      noise: round1(adjustedDelta.noise),
    },
    agentsUsed: decisionSlots.records.map((record) => ({
      id: record.agent.id,
      name: record.agent.name,
      role: record.agent.role,
      goals: record.agent.goals,
      traits: record.agent.traits,
      stance: record.effectiveStance,
      stanceSource: record.stanceSource,
      confidence: record.turn.confidence,
      fallbackReason: record.fallbackReason,
    })),
    diagnostics: {
      stanceCounts: {
        organic: decisionSlots.organicCounts,
        effective: decisionSlots.effectiveCounts,
      },
      forcedSlotsCount: decisionSlots.forcedSlots.length,
      promotedEventsCount: worldState.active_events.length,
      eventPromotionMode: promotion.diagnostics.mode,
      eventPromotionReasonTags: promotion.diagnostics.reasonTags,
      eventPromotionCarryoverCount: promotion.diagnostics.carryoverCount,
      eventPromotionSignalCount: promotion.diagnostics.promotedFromSignalsCount,
      eventPromotionPreviousCount: promotion.diagnostics.previousActiveEventsCount,
      eventPromotionAmbiguityScore: promotion.diagnostics.ambiguityScore,
      eventPromotionSplitEvidence: promotion.diagnostics.splitEvidenceDetected,
      roleDriftMeanOverlap: roleDrift.meanOverlap,
      roleDriftMaxOverlap: roleDrift.maxOverlap,
      roleDriftHighPairCount: roleDrift.highPairCount,
      roleDriftTopPairs: roleDrift.topPairs,
      roleDriftFlaggedAgents: roleDrift.flaggedAgents,
      envelopeApplied: envelope.diagnostics.envelopeApplied,
      trustDeltaRaw: envelope.diagnostics.trustDeltaRaw,
      trustDeltaAdjusted: envelope.diagnostics.trustDeltaAdjusted,
      noiseDeltaRaw: envelope.diagnostics.noiseDeltaRaw,
      noiseDeltaAdjusted: envelope.diagnostics.noiseDeltaAdjusted,
      envelopeDampingFactor: envelope.diagnostics.dampingFactor,
      trustDeltaClamp: envelope.diagnostics.trustClamp,
      noiseDeltaClamp: envelope.diagnostics.noiseClamp,
      contradictionScore,
      salienceAvg,
      salienceStdDev,
      llmFallbackCount,
      llmSuccessCount,
      llmSchemaRepairCount,
      llmFallbackReasonCounts,
      stanceGuidanceSoftCount,
      stanceGuidanceTargetedCount,
    },
  });

  const completeTimestamp = new Date().toISOString();
  const completedCycleRun = CycleRunSchema.parse({
    ...cycleRun,
    status: "completed",
    summary: `Cycle ${cycleNumber} (${scenarioLabel}) finished with ${postsCreated} posts; delta c${runSummary.delta.cohesion >= 0 ? "+" : ""}${runSummary.delta.cohesion} t${runSummary.delta.trust >= 0 ? "+" : ""}${runSummary.delta.trust} n${runSummary.delta.noise >= 0 ? "+" : ""}${runSummary.delta.noise}.`,
    finished_at: completeTimestamp,
  });

  await supabase
    .from("cycle_runs")
    .update({
      status: completedCycleRun.status,
      summary: completedCycleRun.summary,
      finished_at: completedCycleRun.finished_at,
    })
    .eq("id", completedCycleRun.id);

  await supabase.from("cycle_run_summaries").upsert(
    {
      cycle_run_id: completedCycleRun.id,
      session_id: sessionId,
      cycle_number: runSummary.cycleNumber,
      scenario_label: runSummary.scenarioLabel,
      world_brief_used: runSummary.worldBriefUsed,
      posts_created: runSummary.postsCreated,
      delta: runSummary.delta,
      agents_used: runSummary.agentsUsed,
      diagnostics: runSummary.diagnostics ?? null,
    },
    { onConflict: "session_id,cycle_number" },
  );

  await supabase.from("event_logs").insert({
    id: crypto.randomUUID(),
    session_id: sessionId,
    cycle_number: cycleNumber,
    event_type: "cycle_finished",
    source_agent_id: null,
    summary: `Cycle ${cycleNumber} completed.`,
    payload: {
      cycle_run_id: completedCycleRun.id,
      runSummary,
    },
    created_at: completeTimestamp,
  });

  return {
    cycleRun: completedCycleRun,
    worldState,
    runSummary,
  };
}

async function runCycleInMemory(input: RunCycleInput): Promise<RunCycleResult> {
  return mutateStore(async (store) => {
    const now = new Date().toISOString();
    const previousWorld = store.worldStates[store.worldStates.length - 1];
    const cycleNumber = previousWorld.cycle_number + 1;

    const scenarioLabel = input.scenarioLabel?.trim() || "default";
    const worldBriefUsed = input.worldBrief?.trim() || store.simulationConfig.worldBrief;

    const cycleRun = CycleRunSchema.parse({
      id: crypto.randomUUID(),
      cycle_number: cycleNumber,
      status: "running",
      started_at: now,
      finished_at: null,
      summary: `Cycle ${cycleNumber} started (${scenarioLabel}).`,
      created_at: now,
    });
    store.cycleRuns.push(cycleRun);

    const agentsUsed = store.agents.map((agent) => applyAgentOverride(agent, input));

    store.eventLogs.push(
      buildEvent({
        cycleNumber,
        eventType: "cycle_started",
        summary: `Cycle ${cycleNumber} started.`,
        payload: {
          scenarioLabel,
          worldBriefUsed,
          agentOverrides: input.agentOverrides ?? [],
          agentsUsed: agentsUsed.map((agent) => ({
            id: agent.id,
            name: agent.name,
            role: agent.role,
            goals: agent.goals,
            traits: agent.traits,
          })),
        },
      }),
    );

    let delta = { cohesion: 0, trust: 0, noise: 0 };
    const executedTurns: ExecutedTurn[] = [];
    const memorySaliences: number[] = [];
    let llmFallbackCount = 0;
    let llmSuccessCount = 0;
    let llmSchemaRepairCount = 0;
    const llmFallbackReasonCounts: Record<string, number> = {};
    let stanceGuidanceSoftCount = 0;
    let stanceGuidanceTargetedCount = 0;

    for (const effectiveAgent of agentsUsed) {
      const persistedAgent = store.agents.find((agent) => agent.id === effectiveAgent.id);
      if (!persistedAgent) {
        continue;
      }

      const recentFeed = [...store.feedPosts]
        .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
        .slice(0, 8)
        .map((post) => post.content);

      const recentMemories = [...store.agentMemories]
        .filter((memory) => memory.agent_id === persistedAgent.id)
        .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
        .slice(0, 6)
        .map((memory) => memory.content);

      const stanceGuidance = buildStanceGuidance({
        agent: effectiveAgent,
        executedTurns,
        totalAgents: agentsUsed.length,
        scenarioLabel,
      });

      if (stanceGuidance.mode === "soft") {
        stanceGuidanceSoftCount += 1;
      } else if (stanceGuidance.mode === "targeted") {
        stanceGuidanceTargetedCount += 1;
      }

      const execution = await runAgentTurn(effectiveAgent, {
        worldBrief: worldBriefUsed,
        worldSummary: previousWorld.summary,
        recentFeed,
        recentMemories,
        stanceGuidance: stanceGuidance.message,
      });
      const turn = execution.turn;
      executedTurns.push({
        agent: effectiveAgent,
        turn,
        telemetry: execution.telemetry,
      });

      if (execution.telemetry.outputSource === "fallback") {
        llmFallbackCount += 1;
        const code = execution.telemetry.llmErrorCode ?? "unknown_error";
        llmFallbackReasonCounts[code] = (llmFallbackReasonCounts[code] ?? 0) + 1;
      } else {
        llmSuccessCount += 1;
        if (execution.telemetry.llmRepaired) {
          llmSchemaRepairCount += 1;
        }
      }
      const actionTimestamp = new Date().toISOString();

      delta = {
        cohesion: delta.cohesion + turn.delta.cohesion,
        trust: delta.trust + turn.delta.trust,
        noise: delta.noise + turn.delta.noise,
      };

      store.eventLogs.push(
        buildEvent({
          cycleNumber,
          eventType: "agent_action",
          sourceAgentId: effectiveAgent.id,
          summary: `${effectiveAgent.name} executed ${turn.actionType}.`,
          payload: {
            ...turn,
            stanceSource: "organic",
            outputSource: execution.telemetry.outputSource,
            llmAttempted: execution.telemetry.llmAttempted,
            llmModel: execution.telemetry.llmModel,
            llmErrorCode: execution.telemetry.llmErrorCode,
            llmErrorDetail: truncate(execution.telemetry.llmErrorDetail),
            llmRepaired: execution.telemetry.llmRepaired ?? false,
            llmAttempts: execution.telemetry.llmAttempts ?? null,
            stanceGuidanceMode: stanceGuidance.mode,
            stanceGuidanceTarget: stanceGuidance.target ?? null,
            stanceGuidanceMissing: stanceGuidance.missing,
            role: effectiveAgent.role,
            goals: effectiveAgent.goals,
            traits: effectiveAgent.traits,
          },
        }),
      );

      if (execution.telemetry.outputSource === "fallback") {
        store.eventLogs.push(
          buildEvent({
            cycleNumber,
            eventType: "minor_event_created",
            sourceAgentId: effectiveAgent.id,
            summary: `${effectiveAgent.name} used local fallback (${execution.telemetry.llmErrorCode ?? "unknown_error"}).`,
            payload: {
              kind: "llm_fallback",
              outputSource: execution.telemetry.outputSource,
              llmAttempted: execution.telemetry.llmAttempted,
              llmModel: execution.telemetry.llmModel,
              llmErrorCode: execution.telemetry.llmErrorCode,
              llmErrorDetail: truncate(execution.telemetry.llmErrorDetail),
              llmAttempts: execution.telemetry.llmAttempts ?? null,
              actionType: turn.actionType,
              stance: turn.stance,
              confidence: turn.confidence ?? null,
            },
            createdAt: actionTimestamp,
          }),
        );
      }

      if (turn.postContent && turn.postType) {
        store.feedPosts.push(
          FeedPostSchema.parse({
            id: crypto.randomUUID(),
            cycle_number: cycleNumber,
            agent_id: effectiveAgent.id,
            post_type: turn.postType,
            content: turn.postContent,
            created_at: actionTimestamp,
          }),
        );

        store.eventLogs.push(
          buildEvent({
            cycleNumber,
            eventType: "feed_post_created",
            sourceAgentId: effectiveAgent.id,
            summary: `${effectiveAgent.name} posted to feed.`,
            payload: { post_type: turn.postType },
            createdAt: actionTimestamp,
          }),
        );
      }

      const salience = computeMemorySalience({
        turn,
        memoryContent: turn.memoryContent,
        postContent: turn.postContent,
        recentFeed,
        recentMemories,
      });
      memorySaliences.push(salience);

      const memoryEntry = AgentMemorySchema.parse({
        id: crypto.randomUUID(),
        agent_id: effectiveAgent.id,
        memory_type: "observation",
        content: turn.memoryContent,
        salience,
        created_at: actionTimestamp,
        updated_at: actionTimestamp,
      });

      store.agentMemories.push(memoryEntry);
      store.eventLogs.push(
        buildEvent({
          cycleNumber,
          eventType: "memory_updated",
          sourceAgentId: effectiveAgent.id,
          summary: `${effectiveAgent.name} recorded memory.`,
          payload: { memory_type: memoryEntry.memory_type },
          createdAt: actionTimestamp,
        }),
      );

      persistedAgent.status = turn.actionType === "no_op" ? "idle" : "active";
      persistedAgent.last_action_at = actionTimestamp;
      persistedAgent.memory_summary = turn.memoryContent;
      persistedAgent.updated_at = actionTimestamp;
    }

    const decisionSlots = enforceDecisionSlots(executedTurns);

    if (decisionSlots.forcedSlots.length > 0) {
      store.eventLogs.push(
        buildEvent({
          cycleNumber,
          eventType: "minor_event_created",
          summary: `Decision-slot fallback filled ${decisionSlots.forcedSlots.length} missing stance slot(s).`,
          payload: {
            forcedSlotsCount: decisionSlots.forcedSlots.length,
            forcedSlots: decisionSlots.forcedSlots,
            organicStanceCounts: decisionSlots.organicCounts,
            effectiveStanceCounts: decisionSlots.effectiveCounts,
          },
        }),
      );
    }

    const contradictionScore = buildContradictionScore({
      turns: executedTurns,
      effectiveStanceCounts: decisionSlots.effectiveCounts,
      forcedSlotsCount: decisionSlots.forcedSlots.length,
    });
    const roleDrift = buildRoleDriftDiagnostics(executedTurns);
    const envelope = applyTrustNoiseEnvelope({
      rawDelta: delta,
      previousWorld,
      cycleNumber,
    });
    const adjustedDelta = envelope.adjustedDelta;
    const promotion = buildPromotedEvents({
      delta,
      stanceCounts: decisionSlots.effectiveCounts,
      forcedSlotsCount: decisionSlots.forcedSlots.length,
      totalAgents: agentsUsed.length,
      contradictionScore,
      previousActiveEvents: previousWorld.active_events,
    });
    const salienceAvg = round2(avg(memorySaliences));
    const salienceStdDev = round2(stdDev(memorySaliences, salienceAvg));

    const worldState = buildWorldStateUpdate({
      cycleNumber,
      prev: previousWorld,
      delta: adjustedDelta,
      summary: `Cycle ${cycleNumber}: cohesion ${adjustedDelta.cohesion >= 0 ? "+" : ""}${adjustedDelta.cohesion.toFixed(1)}, trust ${adjustedDelta.trust >= 0 ? "+" : ""}${adjustedDelta.trust.toFixed(1)}, noise ${adjustedDelta.noise >= 0 ? "+" : ""}${adjustedDelta.noise.toFixed(1)}.`,
      activeEvents: promotion.events,
    });

    store.worldStates.push(worldState);

    if (roleDrift.highPairCount > 0) {
      store.eventLogs.push(
        buildEvent({
          cycleNumber,
          eventType: "minor_event_created",
          summary: `Role drift signal detected (${roleDrift.highPairCount} high-overlap pair${roleDrift.highPairCount === 1 ? "" : "s"}).`,
          payload: {
            kind: "role_drift_signal",
            roleDriftMeanOverlap: roleDrift.meanOverlap,
            roleDriftMaxOverlap: roleDrift.maxOverlap,
            roleDriftHighPairCount: roleDrift.highPairCount,
            roleDriftTopPairs: roleDrift.topPairs,
          },
        }),
      );
    }

    store.eventLogs.push(
      buildEvent({
        cycleNumber,
        eventType: "world_state_changed",
        summary: `World state updated for cycle ${cycleNumber}.`,
        payload: {
          cohesion: worldState.cohesion,
          trust: worldState.trust,
          noise: worldState.noise,
          promotedEvents: worldState.active_events,
          eventPromotionMode: promotion.diagnostics.mode,
          eventPromotionReasonTags: promotion.diagnostics.reasonTags,
          eventPromotionCarryoverCount: promotion.diagnostics.carryoverCount,
          eventPromotionSignalCount: promotion.diagnostics.promotedFromSignalsCount,
          eventPromotionPreviousCount: promotion.diagnostics.previousActiveEventsCount,
          eventPromotionAmbiguityScore: promotion.diagnostics.ambiguityScore,
          eventPromotionSplitEvidence: promotion.diagnostics.splitEvidenceDetected,
          roleDriftMeanOverlap: roleDrift.meanOverlap,
          roleDriftMaxOverlap: roleDrift.maxOverlap,
          roleDriftHighPairCount: roleDrift.highPairCount,
          roleDriftTopPairs: roleDrift.topPairs,
          roleDriftFlaggedAgents: roleDrift.flaggedAgents,
          envelopeApplied: envelope.diagnostics.envelopeApplied,
          trustDeltaRaw: envelope.diagnostics.trustDeltaRaw,
          trustDeltaAdjusted: envelope.diagnostics.trustDeltaAdjusted,
          noiseDeltaRaw: envelope.diagnostics.noiseDeltaRaw,
          noiseDeltaAdjusted: envelope.diagnostics.noiseDeltaAdjusted,
          envelopeDampingFactor: envelope.diagnostics.dampingFactor,
          trustDeltaClamp: envelope.diagnostics.trustClamp,
          noiseDeltaClamp: envelope.diagnostics.noiseClamp,
          organicStanceCounts: decisionSlots.organicCounts,
          effectiveStanceCounts: decisionSlots.effectiveCounts,
          forcedSlotsCount: decisionSlots.forcedSlots.length,
          contradictionScore,
          salienceAvg,
          salienceStdDev,
          llmFallbackCount,
          llmSuccessCount,
          llmSchemaRepairCount,
          llmFallbackReasonCounts,
          stanceGuidanceSoftCount,
          stanceGuidanceTargetedCount,
          worldBriefUsed,
          scenarioLabel,
        },
      }),
    );

    const postsCreated = store.feedPosts.filter((post) => post.cycle_number === cycleNumber).length;

    const runSummary = RunSummarySchema.parse({
      cycleNumber,
      scenarioLabel,
      worldBriefUsed,
      postsCreated,
      delta: {
        cohesion: round1(adjustedDelta.cohesion),
        trust: round1(adjustedDelta.trust),
        noise: round1(adjustedDelta.noise),
      },
      agentsUsed: decisionSlots.records.map((record) => ({
        id: record.agent.id,
        name: record.agent.name,
        role: record.agent.role,
        goals: record.agent.goals,
        traits: record.agent.traits,
        stance: record.effectiveStance,
        stanceSource: record.stanceSource,
        confidence: record.turn.confidence,
        fallbackReason: record.fallbackReason,
      })),
      diagnostics: {
        stanceCounts: {
          organic: decisionSlots.organicCounts,
          effective: decisionSlots.effectiveCounts,
        },
        forcedSlotsCount: decisionSlots.forcedSlots.length,
        promotedEventsCount: worldState.active_events.length,
        eventPromotionMode: promotion.diagnostics.mode,
        eventPromotionReasonTags: promotion.diagnostics.reasonTags,
        eventPromotionCarryoverCount: promotion.diagnostics.carryoverCount,
        eventPromotionSignalCount: promotion.diagnostics.promotedFromSignalsCount,
        eventPromotionPreviousCount: promotion.diagnostics.previousActiveEventsCount,
        eventPromotionAmbiguityScore: promotion.diagnostics.ambiguityScore,
        eventPromotionSplitEvidence: promotion.diagnostics.splitEvidenceDetected,
        roleDriftMeanOverlap: roleDrift.meanOverlap,
        roleDriftMaxOverlap: roleDrift.maxOverlap,
        roleDriftHighPairCount: roleDrift.highPairCount,
        roleDriftTopPairs: roleDrift.topPairs,
        roleDriftFlaggedAgents: roleDrift.flaggedAgents,
        envelopeApplied: envelope.diagnostics.envelopeApplied,
        trustDeltaRaw: envelope.diagnostics.trustDeltaRaw,
        trustDeltaAdjusted: envelope.diagnostics.trustDeltaAdjusted,
        noiseDeltaRaw: envelope.diagnostics.noiseDeltaRaw,
        noiseDeltaAdjusted: envelope.diagnostics.noiseDeltaAdjusted,
        envelopeDampingFactor: envelope.diagnostics.dampingFactor,
        trustDeltaClamp: envelope.diagnostics.trustClamp,
        noiseDeltaClamp: envelope.diagnostics.noiseClamp,
        contradictionScore,
        salienceAvg,
        salienceStdDev,
        llmFallbackCount,
        llmSuccessCount,
        llmSchemaRepairCount,
        llmFallbackReasonCounts,
        stanceGuidanceSoftCount,
        stanceGuidanceTargetedCount,
      },
    });

    const completeTimestamp = new Date().toISOString();
    const completedCycleRun = CycleRunSchema.parse({
      ...cycleRun,
      status: "completed",
      summary: `Cycle ${cycleNumber} (${scenarioLabel}) finished with ${postsCreated} posts; delta c${runSummary.delta.cohesion >= 0 ? "+" : ""}${runSummary.delta.cohesion} t${runSummary.delta.trust >= 0 ? "+" : ""}${runSummary.delta.trust} n${runSummary.delta.noise >= 0 ? "+" : ""}${runSummary.delta.noise}.`,
      finished_at: completeTimestamp,
    });

    store.cycleRuns[store.cycleRuns.length - 1] = completedCycleRun;

    store.eventLogs.push(
      buildEvent({
        cycleNumber,
        eventType: "cycle_finished",
        summary: `Cycle ${cycleNumber} completed.`,
        payload: {
          cycle_run_id: completedCycleRun.id,
          runSummary,
        },
        createdAt: completeTimestamp,
      }),
    );

    return {
      cycleRun: completedCycleRun,
      worldState,
      runSummary,
    };
  });
}
