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
} from "@/lib/schemas";
import { runAgentTurn } from "@/lib/simulation/agentLoop";
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

export async function runCycle(input: RunCycleInput = {}): Promise<RunCycleResult> {
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
