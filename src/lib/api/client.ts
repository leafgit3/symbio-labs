import {
  Agent,
  AgentMemory,
  AgentMemorySchema,
  AgentSchema,
  CreateAgentInput,
  CycleRun,
  CycleRunSchema,
  EventLog,
  EventLogSchema,
  FeedPost,
  FeedPostSchema,
  RunCycleInput,
  RunSummary,
  RunSummarySchema,
  ScenarioMatrixInput,
  SimulationConfig,
  SimulationConfigSchema,
  UpdateAgentInput,
  WorldState,
  WorldStateSchema,
} from "@/lib/schemas";
import { z } from "zod";

async function request<T>(url: string, schema: z.ZodType<T>, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  const payload = await response.json();
  return schema.parse(payload);
}

export function fetchWorldStateCurrent(): Promise<WorldState> {
  return request("/api/world-state/current", WorldStateSchema);
}

export function fetchAgents(): Promise<Agent[]> {
  return request("/api/agents", z.array(AgentSchema));
}

export function createAgent(input: CreateAgentInput): Promise<Agent> {
  return request("/api/agents", AgentSchema, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateAgent(agentId: string, input: UpdateAgentInput): Promise<Agent> {
  return request(`/api/agents/${agentId}`, AgentSchema, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function fetchAgentMemories(): Promise<AgentMemory[]> {
  return request("/api/agent-memories", z.array(AgentMemorySchema));
}

export function fetchFeed(): Promise<FeedPost[]> {
  return request("/api/feed", z.array(FeedPostSchema));
}

export function fetchEvents(): Promise<EventLog[]> {
  return request("/api/events", z.array(EventLogSchema));
}

export function fetchLatestCycle(): Promise<CycleRun> {
  return request("/api/cycles/latest", CycleRunSchema);
}

export function fetchLatestRunSummary(): Promise<RunSummary | null> {
  return request("/api/cycles/run-summary/latest", RunSummarySchema.nullable());
}

export function fetchCycleHistory(): Promise<
  Array<{
    cycleRun: CycleRun;
    runSummary: RunSummary | null;
  }>
> {
  return request(
    "/api/cycles/history",
    z.array(
      z.object({
        cycleRun: CycleRunSchema,
        runSummary: RunSummarySchema.nullable(),
      }),
    ),
  );
}

export function fetchCycleDetails(cycleNumber: number): Promise<{
  cycleRun: CycleRun | null;
  worldState: WorldState | null;
  runSummary: RunSummary | null;
  feedPosts: FeedPost[];
  eventLogs: EventLog[];
  memories: AgentMemory[];
}> {
  return request(
    `/api/cycles/history/${cycleNumber}`,
    z.object({
      cycleRun: CycleRunSchema.nullable(),
      worldState: WorldStateSchema.nullable(),
      runSummary: RunSummarySchema.nullable(),
      feedPosts: z.array(FeedPostSchema),
      eventLogs: z.array(EventLogSchema),
      memories: z.array(AgentMemorySchema),
    }),
  );
}

export function fetchWorldBriefConfig(): Promise<SimulationConfig> {
  return request("/api/config/world-brief", SimulationConfigSchema);
}

export function saveWorldBriefConfig(worldBrief: string): Promise<SimulationConfig> {
  return request(
    "/api/config/world-brief",
    SimulationConfigSchema,
    {
      method: "POST",
      body: JSON.stringify({ worldBrief }),
    },
  );
}

export function triggerCycle(): Promise<{
  cycleRun: CycleRun;
  worldState: WorldState;
  runSummary: RunSummary;
}> {
  return triggerCycleWithInput({});
}

export function triggerCycleWithInput(input: RunCycleInput): Promise<{
  cycleRun: CycleRun;
  worldState: WorldState;
  runSummary: RunSummary;
}> {
  return request(
    "/api/cycle/run",
    z.object({
      cycleRun: CycleRunSchema,
      worldState: WorldStateSchema,
      runSummary: RunSummarySchema,
    }),
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
}

export function runScenarioMatrix(input: ScenarioMatrixInput): Promise<{
  summaries: Array<{
    scenarioLabel: string;
    run: number;
    cycleNumber: number;
    delta: RunSummary["delta"];
    postsCreated: number;
    worldBriefUsed: string;
  }>;
}> {
  return request(
    "/api/testing/run-matrix",
    z.object({
      summaries: z.array(
        z.object({
          scenarioLabel: z.string(),
          run: z.number().int(),
          cycleNumber: z.number().int(),
          delta: z.object({
            cohesion: z.number(),
            trust: z.number(),
            noise: z.number(),
          }),
          postsCreated: z.number().int(),
          worldBriefUsed: z.string(),
        }),
      ),
    }),
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
}

export function resetSimulation(): Promise<{
  cycleRun: CycleRun;
  worldState: WorldState;
}> {
  return request(
    "/api/simulation/reset",
    z.object({
      cycleRun: CycleRunSchema,
      worldState: WorldStateSchema,
    }),
    {
      method: "POST",
      body: "{}",
    },
  );
}
