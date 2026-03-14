import { getSupabaseServiceClient } from "@/lib/db/supabase";
import { mutateStore } from "@/lib/db/store";
import { buildEvent } from "@/lib/events/eventBuilder";
import {
  Agent,
  AgentMemorySchema,
  CycleRun,
  CycleRunSchema,
  FeedPostSchema,
  RunCycleInput,
  RunSummary,
  RunSummarySchema,
  WorldState,
  WorldStateSchema,
} from "@/lib/schemas";
import { runAgentTurn } from "@/lib/simulation/agentLoop";
import { buildWorldStateUpdate } from "@/lib/world/worldUpdate";

const DEFAULT_WORLD_BRIEF =
  "The citadel is a tiny digital polity testing how coordination, rumor, and skepticism shape trust over repeated cycles.";

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

function toIso(value: string | null): string | null {
  if (!value) {
    return null;
  }

  return new Date(value).toISOString();
}

export async function runCycle(input: RunCycleInput = {}): Promise<RunCycleResult> {
  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    return runCycleInMemory(input);
  }

  const previousWorldResult = await supabase
    .from("world_state")
    .select("*")
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

  const configResult = await supabase.from("simulation_config").select("*").eq("id", "default").maybeSingle();
  if (configResult.error) {
    throw new Error(`Failed reading simulation_config: ${configResult.error.message}`);
  }

  if (!configResult.data) {
    const { error: initConfigError } = await supabase.from("simulation_config").insert({
      id: "default",
      world_brief: DEFAULT_WORLD_BRIEF,
      updated_at: new Date().toISOString(),
    });

    if (initConfigError) {
      throw new Error(`Failed seeding simulation_config: ${initConfigError.message}`);
    }
  }

  const worldBriefStored = configResult.data?.world_brief ?? DEFAULT_WORLD_BRIEF;
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

  for (const effectiveAgent of agentsUsed) {
    const recentFeedResult = await supabase
      .from("feed_posts")
      .select("content, created_at")
      .order("created_at", { ascending: false })
      .limit(8);

    if (recentFeedResult.error) {
      throw new Error(`Failed reading recent feed: ${recentFeedResult.error.message}`);
    }

    const recentMemoriesResult = await supabase
      .from("agent_memories")
      .select("content, created_at")
      .eq("agent_id", effectiveAgent.id)
      .order("created_at", { ascending: false })
      .limit(6);

    if (recentMemoriesResult.error) {
      throw new Error(`Failed reading recent memories: ${recentMemoriesResult.error.message}`);
    }

    const turn = await runAgentTurn(effectiveAgent, {
      worldBrief: worldBriefUsed,
      worldSummary: previousWorld.summary,
      recentFeed: (recentFeedResult.data ?? []).map((row) => row.content),
      recentMemories: (recentMemoriesResult.data ?? []).map((row) => row.content),
    });

    const actionTimestamp = new Date().toISOString();

    delta = {
      cohesion: delta.cohesion + turn.delta.cohesion,
      trust: delta.trust + turn.delta.trust,
      noise: delta.noise + turn.delta.noise,
    };

    await supabase.from("event_logs").insert({
      id: crypto.randomUUID(),
      cycle_number: cycleNumber,
      event_type: "agent_action",
      source_agent_id: effectiveAgent.id,
      summary: `${effectiveAgent.name} executed ${turn.actionType}.`,
      payload: {
        ...turn,
        role: effectiveAgent.role,
        goals: effectiveAgent.goals,
        traits: effectiveAgent.traits,
      },
      created_at: actionTimestamp,
    });

    if (turn.postContent && turn.postType) {
      postsCreated += 1;

      await supabase.from("feed_posts").insert({
        id: crypto.randomUUID(),
        cycle_number: cycleNumber,
        agent_id: effectiveAgent.id,
        post_type: turn.postType,
        content: turn.postContent,
        created_at: actionTimestamp,
      });

      await supabase.from("event_logs").insert({
        id: crypto.randomUUID(),
        cycle_number: cycleNumber,
        event_type: "feed_post_created",
        source_agent_id: effectiveAgent.id,
        summary: `${effectiveAgent.name} posted to feed.`,
        payload: { post_type: turn.postType },
        created_at: actionTimestamp,
      });
    }

    const memoryEntry = AgentMemorySchema.parse({
      id: crypto.randomUUID(),
      agent_id: effectiveAgent.id,
      memory_type: "observation",
      content: turn.memoryContent,
      salience: 0.65,
      created_at: actionTimestamp,
      updated_at: actionTimestamp,
    });

    await supabase.from("agent_memories").insert({
      id: memoryEntry.id,
      agent_id: memoryEntry.agent_id,
      memory_type: memoryEntry.memory_type,
      content: memoryEntry.content,
      salience: memoryEntry.salience,
      created_at: memoryEntry.created_at,
      updated_at: memoryEntry.updated_at,
    });

    await supabase.from("event_logs").insert({
      id: crypto.randomUUID(),
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

  const worldState = buildWorldStateUpdate({
    cycleNumber,
    prev: previousWorld,
    delta,
    summary: `Cycle ${cycleNumber}: cohesion ${delta.cohesion >= 0 ? "+" : ""}${delta.cohesion.toFixed(1)}, trust ${delta.trust >= 0 ? "+" : ""}${delta.trust.toFixed(1)}, noise ${delta.noise >= 0 ? "+" : ""}${delta.noise.toFixed(1)}.`,
  });

  await supabase.from("world_state").insert({
    id: worldState.id,
    cycle_number: worldState.cycle_number,
    summary: worldState.summary,
    cohesion: worldState.cohesion,
    trust: worldState.trust,
    noise: worldState.noise,
    active_events: worldState.active_events,
    created_at: worldState.created_at,
    updated_at: worldState.updated_at,
  });

  await supabase.from("event_logs").insert({
    id: crypto.randomUUID(),
    cycle_number: cycleNumber,
    event_type: "world_state_changed",
    source_agent_id: null,
    summary: `World state updated for cycle ${cycleNumber}.`,
    payload: {
      cohesion: worldState.cohesion,
      trust: worldState.trust,
      noise: worldState.noise,
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
      cohesion: round1(delta.cohesion),
      trust: round1(delta.trust),
      noise: round1(delta.noise),
    },
    agentsUsed: agentsUsed.map((agent) => ({
      id: agent.id,
      name: agent.name,
      role: agent.role,
      goals: agent.goals,
      traits: agent.traits,
    })),
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
      cycle_number: runSummary.cycleNumber,
      scenario_label: runSummary.scenarioLabel,
      world_brief_used: runSummary.worldBriefUsed,
      posts_created: runSummary.postsCreated,
      delta: runSummary.delta,
      agents_used: runSummary.agentsUsed,
    },
    { onConflict: "cycle_number" },
  );

  await supabase.from("event_logs").insert({
    id: crypto.randomUUID(),
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

      const turn = await runAgentTurn(effectiveAgent, {
        worldBrief: worldBriefUsed,
        worldSummary: previousWorld.summary,
        recentFeed,
        recentMemories,
      });
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
            role: effectiveAgent.role,
            goals: effectiveAgent.goals,
            traits: effectiveAgent.traits,
          },
        }),
      );

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

      const memoryEntry = AgentMemorySchema.parse({
        id: crypto.randomUUID(),
        agent_id: effectiveAgent.id,
        memory_type: "observation",
        content: turn.memoryContent,
        salience: 0.65,
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

    const worldState = buildWorldStateUpdate({
      cycleNumber,
      prev: previousWorld,
      delta,
      summary: `Cycle ${cycleNumber}: cohesion ${delta.cohesion >= 0 ? "+" : ""}${delta.cohesion.toFixed(1)}, trust ${delta.trust >= 0 ? "+" : ""}${delta.trust.toFixed(1)}, noise ${delta.noise >= 0 ? "+" : ""}${delta.noise.toFixed(1)}.`,
    });

    store.worldStates.push(worldState);

    store.eventLogs.push(
      buildEvent({
        cycleNumber,
        eventType: "world_state_changed",
        summary: `World state updated for cycle ${cycleNumber}.`,
        payload: {
          cohesion: worldState.cohesion,
          trust: worldState.trust,
          noise: worldState.noise,
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
        cohesion: round1(delta.cohesion),
        trust: round1(delta.trust),
        noise: round1(delta.noise),
      },
      agentsUsed: agentsUsed.map((agent) => ({
        id: agent.id,
        name: agent.name,
        role: agent.role,
        goals: agent.goals,
        traits: agent.traits,
      })),
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
