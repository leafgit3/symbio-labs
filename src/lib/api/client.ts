import {
  Agent,
  AgentMemory,
  AgentMemorySchema,
  AgentSchema,
  CycleRun,
  CycleRunSchema,
  EventLog,
  EventLogSchema,
  FeedPost,
  FeedPostSchema,
  SimulationConfig,
  SimulationConfigSchema,
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
}> {
  return request(
    "/api/cycle/run",
    z.object({
      cycleRun: CycleRunSchema,
      worldState: WorldStateSchema,
    }),
    { method: "POST" },
  );
}
