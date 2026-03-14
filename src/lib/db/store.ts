import {
  Agent,
  AgentMemory,
  AgentMemorySchema,
  AgentSchema,
  CycleRun,
  CycleRunSchema,
  EventLog,
  FeedPost,
  FeedPostSchema,
  SimulationConfig,
  SimulationConfigSchema,
  WorldState,
  WorldStateSchema,
} from "@/lib/schemas";

type Store = {
  agents: Agent[];
  agentMemories: AgentMemory[];
  worldStates: WorldState[];
  feedPosts: FeedPost[];
  eventLogs: EventLog[];
  cycleRuns: CycleRun[];
  simulationConfig: SimulationConfig;
};

declare global {
  var __symbioStore: Store | undefined;
}

function seedStore(): Store {
  const now = new Date().toISOString();

  const agents = [
    {
      id: "11111111-1111-4111-8111-111111111111",
      name: "Kite",
      role: "Coordinator / Distributor",
      goals: ["maintain continuity", "reduce confusion"],
      traits: ["calm", "methodical", "cohesion-seeking"],
      status: "ready",
      memory_summary: "Boot cycle complete. Stabilization mode active.",
      last_action_at: null,
      created_at: now,
      updated_at: now,
    },
    {
      id: "22222222-2222-4222-8222-222222222222",
      name: "Foil",
      role: "Surface / Rumor Agent",
      goals: ["amplify weak signals", "surface hidden change"],
      traits: ["reactive", "loud", "curious"],
      status: "ready",
      memory_summary: "Initial signal net deployed.",
      last_action_at: null,
      created_at: now,
      updated_at: now,
    },
    {
      id: "33333333-3333-4333-8333-333333333333",
      name: "Lens",
      role: "Auditor / Skeptic",
      goals: ["question assumptions", "improve consistency"],
      traits: ["skeptical", "precise", "evidence-first"],
      status: "ready",
      memory_summary: "Baseline audit checks installed.",
      last_action_at: null,
      created_at: now,
      updated_at: now,
    },
  ].map((agent) => AgentSchema.parse(agent));

  const worldState = WorldStateSchema.parse({
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    cycle_number: 0,
    summary: "Bootstrapped world. Metrics are neutral and observable.",
    cohesion: 50,
    trust: 50,
    noise: 50,
    active_events: [],
    created_at: now,
    updated_at: now,
  });

  const cycleRun = CycleRunSchema.parse({
    id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    cycle_number: 0,
    status: "completed",
    started_at: now,
    finished_at: now,
    summary: "Initial seed cycle.",
    created_at: now,
  });

  const memory = AgentMemorySchema.parse({
    id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    agent_id: agents[0].id,
    memory_type: "summary",
    content: "System came online with explicit persistence and logs.",
    salience: 0.8,
    created_at: now,
    updated_at: now,
  });

  const post = FeedPostSchema.parse({
    id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
    cycle_number: 0,
    agent_id: agents[0].id,
    post_type: "statement",
    content: "Citadel boot complete. Beginning baseline observation.",
    created_at: now,
  });

  const simulationConfig = SimulationConfigSchema.parse({
    worldBrief:
      "The citadel is a tiny digital polity testing how coordination, rumor, and skepticism shape trust over repeated cycles.",
    updatedAt: now,
  });

  return {
    agents,
    agentMemories: [memory],
    worldStates: [worldState],
    feedPosts: [post],
    eventLogs: [],
    cycleRuns: [cycleRun],
    simulationConfig,
  };
}

function getStore(): Store {
  if (!global.__symbioStore) {
    global.__symbioStore = seedStore();
  }

  return global.__symbioStore;
}

export function readStore(): Store {
  return structuredClone(getStore());
}

export function mutateStore<T>(updater: (store: Store) => T): T {
  const store = getStore();
  return updater(store);
}
