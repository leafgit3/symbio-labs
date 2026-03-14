import { mutateStore } from "@/lib/db/store";
import { buildEvent } from "@/lib/events/eventBuilder";
import {
  AgentMemorySchema,
  CycleRun,
  CycleRunSchema,
  FeedPostSchema,
  WorldState,
} from "@/lib/schemas";
import { runAgentTurn } from "@/lib/simulation/agentLoop";
import { buildWorldStateUpdate } from "@/lib/world/worldUpdate";

export type RunCycleResult = {
  cycleRun: CycleRun;
  worldState: WorldState;
};

export async function runCycle(): Promise<RunCycleResult> {
  return mutateStore(async (store) => {
    const now = new Date().toISOString();
    const previousWorld = store.worldStates[store.worldStates.length - 1];
    const cycleNumber = previousWorld.cycle_number + 1;

    const cycleRun = CycleRunSchema.parse({
      id: crypto.randomUUID(),
      cycle_number: cycleNumber,
      status: "running",
      started_at: now,
      finished_at: null,
      summary: "Cycle started.",
      created_at: now,
    });
    store.cycleRuns.push(cycleRun);

    store.eventLogs.push(
      buildEvent({
        cycleNumber,
        eventType: "cycle_started",
        summary: `Cycle ${cycleNumber} started.`,
      }),
    );

    let delta = { cohesion: 0, trust: 0, noise: 0 };

    for (const agent of store.agents) {
      const recentFeed = [...store.feedPosts]
        .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
        .slice(0, 8)
        .map((post) => post.content);

      const recentMemories = [...store.agentMemories]
        .filter((memory) => memory.agent_id === agent.id)
        .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
        .slice(0, 6)
        .map((memory) => memory.content);

      const turn = await runAgentTurn(agent, {
        worldBrief: store.simulationConfig.worldBrief,
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
          sourceAgentId: agent.id,
          summary: `${agent.name} executed ${turn.actionType}.`,
          payload: turn,
        }),
      );

      if (turn.postContent && turn.postType) {
        store.feedPosts.push(
          FeedPostSchema.parse({
            id: crypto.randomUUID(),
            cycle_number: cycleNumber,
            agent_id: agent.id,
            post_type: turn.postType,
            content: turn.postContent,
            created_at: actionTimestamp,
          }),
        );

        store.eventLogs.push(
          buildEvent({
            cycleNumber,
            eventType: "feed_post_created",
            sourceAgentId: agent.id,
            summary: `${agent.name} posted to feed.`,
            payload: { post_type: turn.postType },
            createdAt: actionTimestamp,
          }),
        );
      }

      const memoryEntry = AgentMemorySchema.parse({
        id: crypto.randomUUID(),
        agent_id: agent.id,
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
          sourceAgentId: agent.id,
          summary: `${agent.name} recorded memory.`,
          payload: { memory_type: memoryEntry.memory_type },
          createdAt: actionTimestamp,
        }),
      );

      agent.status = turn.actionType === "no_op" ? "idle" : "active";
      agent.last_action_at = actionTimestamp;
      agent.memory_summary = turn.memoryContent;
      agent.updated_at = actionTimestamp;
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
          world_brief: store.simulationConfig.worldBrief,
        },
      }),
    );

    const completeTimestamp = new Date().toISOString();
    const completedCycleRun = CycleRunSchema.parse({
      ...cycleRun,
      status: "completed",
      summary: `Cycle ${cycleNumber} finished with ${store.feedPosts.filter((post) => post.cycle_number === cycleNumber).length} posts.`,
      finished_at: completeTimestamp,
    });

    store.cycleRuns[store.cycleRuns.length - 1] = completedCycleRun;

    store.eventLogs.push(
      buildEvent({
        cycleNumber,
        eventType: "cycle_finished",
        summary: `Cycle ${cycleNumber} completed.`,
        payload: { cycle_run_id: completedCycleRun.id },
        createdAt: completeTimestamp,
      }),
    );

    return {
      cycleRun: completedCycleRun,
      worldState,
    };
  });
}
