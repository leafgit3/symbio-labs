import { mutateStore, readStore } from "@/lib/db/store";
import { createSimulationSession, getOrCreateSimulationContext } from "@/lib/db/simulationContext";
import { getSupabaseServiceClient } from "@/lib/db/supabase";
import {
  Agent,
  CreateAgentInput,
  UpdateAgentInput,
  AgentSchema,
  AgentMemory,
  AgentMemorySchema,
  CycleRun,
  CycleRunSchema,
  EventLog,
  EventLogSchema,
  FeedPost,
  FeedPostSchema,
  RunSummary,
  RunSummarySchema,
  SimulationConfig,
  SimulationConfigSchema,
  WorldState,
  WorldStateSchema,
} from "@/lib/schemas";

const BASELINE_WORLD_SUMMARY = "Bootstrapped world. Metrics are neutral and observable.";
const BASELINE_CYCLE_SUMMARY = "Simulation reset baseline.";

type JsonArray = string[];

function asArray(value: unknown): JsonArray {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => String(item));
}

function toIso(value: string): string {
  return new Date(value).toISOString();
}

function toIsoNullable(value: string | null): string | null {
  if (!value) {
    return null;
  }

  return new Date(value).toISOString();
}

function parseAgentRow(row: Record<string, unknown>): Agent {
  return AgentSchema.parse({
    ...row,
    goals: asArray(row.goals),
    traits: asArray(row.traits),
    last_action_at: toIsoNullable(row.last_action_at ? String(row.last_action_at) : null),
    created_at: toIso(String(row.created_at)),
    updated_at: toIso(String(row.updated_at)),
  });
}

export function hasSupabaseRuntime(): boolean {
  return Boolean(getSupabaseServiceClient());
}

export async function getWorldStateCurrent(): Promise<WorldState> {
  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    const store = readStore();
    return store.worldStates[store.worldStates.length - 1];
  }

  const { sessionId } = await getOrCreateSimulationContext();

  const { data, error } = await supabase
    .from("world_state")
    .select("*")
    .eq("session_id", sessionId)
    .order("cycle_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    throw new Error(`Failed to read world_state: ${error?.message ?? "missing row"}`);
  }

  return WorldStateSchema.parse({
    ...data,
    active_events: asArray(data.active_events),
    created_at: toIso(data.created_at),
    updated_at: toIso(data.updated_at),
  });
}

export async function getAgents(): Promise<Agent[]> {
  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    const store = readStore();
    return [...store.agents].sort((a, b) => a.name.localeCompare(b.name));
  }

  const { data, error } = await supabase.from("agents").select("*").order("name", { ascending: true });
  if (error || !data) {
    throw new Error(`Failed to read agents: ${error?.message ?? "unknown"}`);
  }

  return data.map((row) => parseAgentRow(row as Record<string, unknown>));
}

export async function createAgent(input: CreateAgentInput): Promise<Agent> {
  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    return mutateStore((store) => {
      const now = new Date().toISOString();
      const agent = AgentSchema.parse({
        id: crypto.randomUUID(),
        name: input.name,
        role: input.role,
        goals: input.goals,
        traits: input.traits,
        status: "ready",
        memory_summary: input.memory_summary,
        last_action_at: null,
        created_at: now,
        updated_at: now,
      });

      store.agents.push(agent);
      return agent;
    });
  }

  const { data, error } = await supabase
    .from("agents")
    .insert({
      name: input.name,
      role: input.role,
      goals: input.goals,
      traits: input.traits,
      status: "ready",
      memory_summary: input.memory_summary,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(`Failed to create agent: ${error?.message ?? "unknown"}`);
  }

  return parseAgentRow(data as Record<string, unknown>);
}

export async function updateAgent(agentId: string, input: UpdateAgentInput): Promise<Agent> {
  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    return mutateStore((store) => {
      const index = store.agents.findIndex((agent) => agent.id === agentId);
      if (index < 0) {
        throw new Error("Agent not found.");
      }

      const existing = store.agents[index];
      const updated = AgentSchema.parse({
        ...existing,
        ...input,
        goals: input.goals ?? existing.goals,
        traits: input.traits ?? existing.traits,
        updated_at: new Date().toISOString(),
      });

      store.agents[index] = updated;
      return updated;
    });
  }

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (input.name !== undefined) {
    updates.name = input.name;
  }

  if (input.role !== undefined) {
    updates.role = input.role;
  }

  if (input.goals !== undefined) {
    updates.goals = input.goals;
  }

  if (input.traits !== undefined) {
    updates.traits = input.traits;
  }

  if (input.memory_summary !== undefined) {
    updates.memory_summary = input.memory_summary;
  }

  const { data, error } = await supabase.from("agents").update(updates).eq("id", agentId).select("*").maybeSingle();

  if (error) {
    throw new Error(`Failed to update agent: ${error.message}`);
  }

  if (!data) {
    throw new Error("Agent not found.");
  }

  return parseAgentRow(data as Record<string, unknown>);
}

export async function resetSimulationState(): Promise<{ cycleRun: CycleRun; worldState: WorldState }> {
  const now = new Date().toISOString();
  const worldState = WorldStateSchema.parse({
    id: crypto.randomUUID(),
    cycle_number: 0,
    summary: BASELINE_WORLD_SUMMARY,
    cohesion: 50,
    trust: 50,
    noise: 50,
    active_events: [],
    created_at: now,
    updated_at: now,
  });

  const cycleRun = CycleRunSchema.parse({
    id: crypto.randomUUID(),
    cycle_number: 0,
    status: "completed",
    started_at: now,
    finished_at: now,
    summary: BASELINE_CYCLE_SUMMARY,
    created_at: now,
  });

  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    return mutateStore((store) => {
      store.agentMemories = [];
      store.feedPosts = [];
      store.eventLogs = [];
      store.worldStates = [worldState];
      store.cycleRuns = [cycleRun];
      store.agents = store.agents.map((agent) =>
        AgentSchema.parse({
          ...agent,
          status: "ready",
          last_action_at: null,
          memory_summary: "",
          updated_at: now,
        }),
      );

      return { cycleRun, worldState };
    });
  }

  await getOrCreateSimulationContext();
  const sessionId = await createSimulationSession("reset");

  const activateSession = await supabase
    .from("simulation_config")
    .update({
      active_session_id: sessionId,
      updated_at: now,
    })
    .eq("id", "default");

  if (activateSession.error) {
    throw new Error(`Failed activating reset session: ${activateSession.error.message}`);
  }

  const resetAgents = await supabase
    .from("agents")
    .update({
      status: "ready",
      last_action_at: null,
      memory_summary: "",
      updated_at: now,
    })
    .not("id", "is", null);

  if (resetAgents.error) {
    throw new Error(`Failed resetting agents: ${resetAgents.error.message}`);
  }

  const insertWorld = await supabase.from("world_state").insert({
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

  if (insertWorld.error) {
    throw new Error(`Failed seeding world_state baseline: ${insertWorld.error.message}`);
  }

  const insertCycle = await supabase.from("cycle_runs").insert({
    id: cycleRun.id,
    session_id: sessionId,
    cycle_number: cycleRun.cycle_number,
    status: cycleRun.status,
    started_at: cycleRun.started_at,
    finished_at: cycleRun.finished_at,
    summary: cycleRun.summary,
    created_at: cycleRun.created_at,
  });

  if (insertCycle.error) {
    throw new Error(`Failed seeding cycle_runs baseline: ${insertCycle.error.message}`);
  }

  return { cycleRun, worldState };
}

export async function getAgentMemories(limit = 200): Promise<AgentMemory[]> {
  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    const store = readStore();
    return [...store.agentMemories]
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
      .slice(0, limit);
  }

  const { sessionId } = await getOrCreateSimulationContext();

  const { data, error } = await supabase
    .from("agent_memories")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) {
    throw new Error(`Failed to read agent_memories: ${error?.message ?? "unknown"}`);
  }

  return data.map((row) =>
    AgentMemorySchema.parse({
      ...row,
      created_at: toIso(row.created_at),
      updated_at: toIso(row.updated_at),
    }),
  );
}

export async function getFeedPosts(limit = 50): Promise<FeedPost[]> {
  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    const store = readStore();
    return [...store.feedPosts]
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
      .slice(0, limit);
  }

  const { sessionId } = await getOrCreateSimulationContext();

  const { data, error } = await supabase
    .from("feed_posts")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) {
    throw new Error(`Failed to read feed_posts: ${error?.message ?? "unknown"}`);
  }

  return data.map((row) =>
    FeedPostSchema.parse({
      ...row,
      created_at: toIso(row.created_at),
    }),
  );
}

export async function getEventLogs(limit = 120): Promise<EventLog[]> {
  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    const store = readStore();
    return [...store.eventLogs]
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
      .slice(0, limit);
  }

  const { sessionId } = await getOrCreateSimulationContext();

  const { data, error } = await supabase
    .from("event_logs")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) {
    throw new Error(`Failed to read event_logs: ${error?.message ?? "unknown"}`);
  }

  return data.map((row) =>
    EventLogSchema.parse({
      ...row,
      payload: row.payload && typeof row.payload === "object" ? row.payload : {},
      created_at: toIso(row.created_at),
    }),
  );
}

export async function getLatestCycleRun(): Promise<CycleRun> {
  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    const store = readStore();
    return store.cycleRuns[store.cycleRuns.length - 1];
  }

  const { sessionId } = await getOrCreateSimulationContext();

  const { data, error } = await supabase
    .from("cycle_runs")
    .select("*")
    .eq("session_id", sessionId)
    .order("cycle_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    throw new Error(`Failed to read cycle_runs: ${error?.message ?? "missing row"}`);
  }

  return CycleRunSchema.parse({
    ...data,
    started_at: toIso(data.started_at),
    finished_at: toIsoNullable(data.finished_at),
    created_at: toIso(data.created_at),
  });
}

export async function getWorldBriefConfig(): Promise<SimulationConfig> {
  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    const store = readStore();
    return SimulationConfigSchema.parse(store.simulationConfig);
  }

  const context = await getOrCreateSimulationContext();

  const { data, error } = await supabase
    .from("simulation_config")
    .select("updated_at")
    .eq("id", "default")
    .single();

  if (error || !data) {
    throw new Error(`Failed to read simulation_config updated_at: ${error?.message ?? "unknown"}`);
  }

  return SimulationConfigSchema.parse({
    worldBrief: context.worldBrief,
    updatedAt: toIso(data.updated_at),
  });
}

export async function setWorldBrief(worldBrief: string): Promise<SimulationConfig> {
  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    throw new Error("World brief update requires runtime store fallback mutation path.");
  }

  const context = await getOrCreateSimulationContext();

  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("simulation_config")
    .upsert(
      {
        id: "default",
        world_brief: worldBrief,
        active_session_id: context.sessionId,
        updated_at: now,
      },
      { onConflict: "id" },
    )
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(`Failed to update simulation_config: ${error?.message ?? "unknown"}`);
  }

  return SimulationConfigSchema.parse({
    worldBrief: data.world_brief,
    updatedAt: toIso(data.updated_at),
  });
}

export async function setWorldBriefFallback(worldBrief: string): Promise<SimulationConfig> {
  const config = mutateStore((store) => {
    store.simulationConfig = {
      worldBrief,
      updatedAt: new Date().toISOString(),
    };

    return store.simulationConfig;
  });

  return SimulationConfigSchema.parse(config);
}

export async function getLatestRunSummary(): Promise<RunSummary | null> {
  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    const store = readStore();

    const event = [...store.eventLogs]
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
      .find((item) => item.event_type === "cycle_finished" && item.payload && typeof item.payload === "object");

    const maybeSummary =
      event && typeof event.payload === "object" && "runSummary" in event.payload
        ? (event.payload as { runSummary?: unknown }).runSummary
        : null;

    const parsed = RunSummarySchema.safeParse(maybeSummary);
    return parsed.success ? parsed.data : null;
  }

  const { sessionId } = await getOrCreateSimulationContext();

  const { data, error } = await supabase
    .from("cycle_run_summaries")
    .select("*")
    .eq("session_id", sessionId)
    .order("cycle_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to read cycle_run_summaries: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  return RunSummarySchema.parse({
    cycleNumber: data.cycle_number,
    scenarioLabel: data.scenario_label,
    worldBriefUsed: data.world_brief_used,
    postsCreated: data.posts_created,
    delta: data.delta,
    agentsUsed: Array.isArray(data.agents_used) ? data.agents_used : [],
    diagnostics: data.diagnostics && typeof data.diagnostics === "object" ? data.diagnostics : undefined,
  });
}

export async function getCycleHistory(limit = 100): Promise<Array<{ cycleRun: CycleRun; runSummary: RunSummary | null }>> {
  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    const store = readStore();
    const summariesByCycle = new Map<number, RunSummary>();

    for (const event of store.eventLogs) {
      if (event.event_type !== "cycle_finished") {
        continue;
      }

      const maybe =
        event.payload && typeof event.payload === "object" && "runSummary" in event.payload
          ? (event.payload as { runSummary?: unknown }).runSummary
          : null;

      const parsed = RunSummarySchema.safeParse(maybe);
      if (parsed.success) {
        summariesByCycle.set(parsed.data.cycleNumber, parsed.data);
      }
    }

    return [...store.cycleRuns]
      .sort((a, b) => b.cycle_number - a.cycle_number)
      .slice(0, limit)
      .map((cycleRun) => ({
        cycleRun,
        runSummary: summariesByCycle.get(cycleRun.cycle_number) ?? null,
      }));
  }

  const { sessionId } = await getOrCreateSimulationContext();

  const { data: cycles, error: cyclesError } = await supabase
    .from("cycle_runs")
    .select("*")
    .eq("session_id", sessionId)
    .order("cycle_number", { ascending: false })
    .limit(limit);

  if (cyclesError || !cycles) {
    throw new Error(`Failed to read cycle history: ${cyclesError?.message ?? "unknown"}`);
  }

  const cycleNumbers = cycles.map((row) => row.cycle_number);
  let summariesByCycle = new Map<number, RunSummary>();

  if (cycleNumbers.length) {
    const { data: summaries, error: summariesError } = await supabase
      .from("cycle_run_summaries")
      .select("*")
      .eq("session_id", sessionId)
      .in("cycle_number", cycleNumbers);

    if (summariesError) {
      throw new Error(`Failed to read cycle summaries: ${summariesError.message}`);
    }

    summariesByCycle = new Map(
      (summaries ?? []).map((row) => [
        row.cycle_number,
        RunSummarySchema.parse({
          cycleNumber: row.cycle_number,
          scenarioLabel: row.scenario_label,
          worldBriefUsed: row.world_brief_used,
          postsCreated: row.posts_created,
          delta: row.delta,
          agentsUsed: Array.isArray(row.agents_used) ? row.agents_used : [],
          diagnostics: row.diagnostics && typeof row.diagnostics === "object" ? row.diagnostics : undefined,
        }),
      ]),
    );
  }

  return cycles.map((row) => ({
    cycleRun: CycleRunSchema.parse({
      ...row,
      started_at: toIso(row.started_at),
      finished_at: toIsoNullable(row.finished_at),
      created_at: toIso(row.created_at),
    }),
    runSummary: summariesByCycle.get(row.cycle_number) ?? null,
  }));
}

export async function getCycleDetails(cycleNumber: number): Promise<{
  cycleRun: CycleRun | null;
  worldState: WorldState | null;
  runSummary: RunSummary | null;
  feedPosts: FeedPost[];
  eventLogs: EventLog[];
  memories: AgentMemory[];
}> {
  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    const store = readStore();

    const cycleRun = store.cycleRuns.find((item) => item.cycle_number === cycleNumber) ?? null;
    const worldState = store.worldStates.find((item) => item.cycle_number === cycleNumber) ?? null;
    const feedPosts = store.feedPosts.filter((item) => item.cycle_number === cycleNumber);
    const eventLogs = store.eventLogs.filter((item) => item.cycle_number === cycleNumber);

    const memoryAgentIds = new Set(eventLogs.map((event) => event.source_agent_id).filter(Boolean));
    const memories = store.agentMemories.filter((memory) => memoryAgentIds.has(memory.agent_id));

    const finishedEvent = eventLogs.find((item) => item.event_type === "cycle_finished");
    const maybeRunSummary =
      finishedEvent && finishedEvent.payload && typeof finishedEvent.payload === "object"
        ? (finishedEvent.payload as { runSummary?: unknown }).runSummary
        : null;
    const parsedRunSummary = RunSummarySchema.safeParse(maybeRunSummary);
    const runSummary = parsedRunSummary.success ? parsedRunSummary.data : null;

    return {
      cycleRun,
      worldState,
      runSummary,
      feedPosts,
      eventLogs,
      memories,
    };
  }

  const { sessionId } = await getOrCreateSimulationContext();

  const [cycleRunResult, worldStateResult, summaryResult, feedResult, eventsResult] = await Promise.all([
    supabase.from("cycle_runs").select("*").eq("session_id", sessionId).eq("cycle_number", cycleNumber).maybeSingle(),
    supabase.from("world_state").select("*").eq("session_id", sessionId).eq("cycle_number", cycleNumber).maybeSingle(),
    supabase.from("cycle_run_summaries").select("*").eq("session_id", sessionId).eq("cycle_number", cycleNumber).maybeSingle(),
    supabase.from("feed_posts").select("*").eq("session_id", sessionId).eq("cycle_number", cycleNumber).order("created_at", { ascending: true }),
    supabase.from("event_logs").select("*").eq("session_id", sessionId).eq("cycle_number", cycleNumber).order("created_at", { ascending: true }),
  ]);

  if (cycleRunResult.error) {
    throw new Error(`Failed reading cycle_run: ${cycleRunResult.error.message}`);
  }

  if (worldStateResult.error) {
    throw new Error(`Failed reading world_state: ${worldStateResult.error.message}`);
  }

  if (summaryResult.error) {
    throw new Error(`Failed reading cycle summary: ${summaryResult.error.message}`);
  }

  if (feedResult.error) {
    throw new Error(`Failed reading feed for cycle: ${feedResult.error.message}`);
  }

  if (eventsResult.error) {
    throw new Error(`Failed reading events for cycle: ${eventsResult.error.message}`);
  }

  const normalizedEventLogs = (eventsResult.data ?? []).map((row) =>
    EventLogSchema.parse({
      ...row,
      payload: row.payload ?? {},
      created_at: toIso(row.created_at),
    }),
  );

  const memoryAgentIds = Array.from(
    new Set(
      normalizedEventLogs
        .map((event) => event.source_agent_id)
        .filter((value): value is string => Boolean(value)),
    ),
  );

  let memories: AgentMemory[] = [];
  if (memoryAgentIds.length) {
    const { data: memoryRows, error: memoryError } = await supabase
      .from("agent_memories")
      .select("*")
      .eq("session_id", sessionId)
      .in("agent_id", memoryAgentIds)
      .order("created_at", { ascending: false })
      .limit(200);

    if (memoryError) {
      throw new Error(`Failed reading memories for cycle: ${memoryError.message}`);
    }

    memories = (memoryRows ?? []).map((row) =>
      AgentMemorySchema.parse({
        ...row,
        created_at: toIso(row.created_at),
        updated_at: toIso(row.updated_at),
      }),
    );
  }

  return {
    cycleRun: cycleRunResult.data
      ? CycleRunSchema.parse({
          ...cycleRunResult.data,
          started_at: toIso(cycleRunResult.data.started_at),
          finished_at: toIsoNullable(cycleRunResult.data.finished_at),
          created_at: toIso(cycleRunResult.data.created_at),
        })
      : null,
    worldState: worldStateResult.data
      ? WorldStateSchema.parse({
          ...worldStateResult.data,
          active_events: asArray(worldStateResult.data.active_events),
          created_at: toIso(worldStateResult.data.created_at),
          updated_at: toIso(worldStateResult.data.updated_at),
        })
      : null,
    runSummary: summaryResult.data
      ? RunSummarySchema.parse({
          cycleNumber: summaryResult.data.cycle_number,
          scenarioLabel: summaryResult.data.scenario_label,
          worldBriefUsed: summaryResult.data.world_brief_used,
          postsCreated: summaryResult.data.posts_created,
          delta: summaryResult.data.delta,
          agentsUsed: Array.isArray(summaryResult.data.agents_used) ? summaryResult.data.agents_used : [],
          diagnostics:
            summaryResult.data.diagnostics && typeof summaryResult.data.diagnostics === "object"
              ? summaryResult.data.diagnostics
              : undefined,
        })
      : null,
    feedPosts: (feedResult.data ?? []).map((row) =>
      FeedPostSchema.parse({
        ...row,
        created_at: toIso(row.created_at),
      }),
    ),
    eventLogs: normalizedEventLogs,
    memories,
  };
}
