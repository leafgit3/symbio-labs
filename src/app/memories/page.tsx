"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DataTable } from "@/components/dashboard/table";
import { Panel } from "@/components/dashboard/panel";
import { fetchAgentMemories, fetchAgents, fetchFeed, fetchLatestCycle } from "@/lib/api/client";
import { Agent, AgentMemory, FeedPost } from "@/lib/schemas";

const EMPTY_AGENTS: Agent[] = [];
const EMPTY_MEMORIES: AgentMemory[] = [];
const EMPTY_FEED: FeedPost[] = [];

type DriftRow = {
  agent_name: string;
  memory_summary: string;
};

type MismatchRow = {
  agent_name: string;
  latest_post: string;
  latest_memory: string;
  overlap: string;
  verdict: string;
};

type MemoryTimelineRow = {
  agent_name: string;
  memory_type: AgentMemory["memory_type"];
  salience: string;
  content: string;
  created_at: string;
};

export default function MemoriesPage() {
  const [agentFilter, setAgentFilter] = useState<string>("all");

  const agentsQuery = useQuery({ queryKey: ["agents"], queryFn: fetchAgents });
  const memoriesQuery = useQuery({ queryKey: ["agent-memories"], queryFn: fetchAgentMemories, refetchInterval: 10_000 });
  const feedQuery = useQuery({ queryKey: ["feed"], queryFn: fetchFeed, refetchInterval: 10_000 });
  const latestCycleQuery = useQuery({ queryKey: ["latest-cycle"], queryFn: fetchLatestCycle });

  const agents = agentsQuery.data ?? EMPTY_AGENTS;
  const memories = memoriesQuery.data ?? EMPTY_MEMORIES;
  const feed = feedQuery.data ?? EMPTY_FEED;

  const agentsById = useMemo(() => new Map(agents.map((agent) => [agent.id, agent])), [agents]);

  const filteredMemories = useMemo(() => {
    if (agentFilter === "all") {
      return memories;
    }

    return memories.filter((memory) => memory.agent_id === agentFilter);
  }, [agentFilter, memories]);

  const memoryTimelineRows = useMemo<MemoryTimelineRow[]>(() => {
    return filteredMemories.slice(0, 120).map((memory) => ({
      agent_name: agentsById.get(memory.agent_id)?.name ?? memory.agent_id,
      memory_type: memory.memory_type,
      salience: memory.salience.toFixed(2),
      content: memory.content,
      created_at: formatIso(memory.created_at),
    }));
  }, [agentsById, filteredMemories]);

  const driftRows = useMemo<DriftRow[]>(() => {
    return agents.map((agent) => ({
      agent_name: agent.name,
      memory_summary: agent.memory_summary,
    }));
  }, [agents]);

  const alignmentScore = useMemo(() => {
    const summaries = driftRows.map((row) => row.memory_summary).filter(Boolean);

    if (summaries.length < 2) {
      return 1;
    }

    let pairCount = 0;
    let sum = 0;

    for (let i = 0; i < summaries.length; i += 1) {
      for (let j = i + 1; j < summaries.length; j += 1) {
        sum += tokenOverlap(summaries[i], summaries[j]);
        pairCount += 1;
      }
    }

    return pairCount === 0 ? 1 : sum / pairCount;
  }, [driftRows]);

  const alignmentLabel = useMemo(() => {
    if (alignmentScore >= 0.33) {
      return "aligned";
    }

    if (alignmentScore >= 0.18) {
      return "mixed";
    }

    return "drifting";
  }, [alignmentScore]);

  const mismatchRows = useMemo<MismatchRow[]>(() => {
    return agents.map((agent) => {
      const latestMemory = memories.find((memory) => memory.agent_id === agent.id);
      const latestPost = feed.find((post) => post.agent_id === agent.id);
      const overlap = tokenOverlap(latestMemory?.content ?? "", latestPost?.content ?? "");

      let verdict = "aligned";
      if (overlap < 0.18) {
        verdict = "mismatch";
      } else if (overlap < 0.33) {
        verdict = "partial";
      }

      return {
        agent_name: agent.name,
        latest_post: excerpt(latestPost?.content ?? "-"),
        latest_memory: excerpt(latestMemory?.content ?? "-"),
        overlap: `${Math.round(overlap * 100)}%`,
        verdict,
      };
    });
  }, [agents, feed, memories]);

  const avgSalience = useMemo(() => {
    if (!filteredMemories.length) {
      return 0;
    }

    const sum = filteredMemories.reduce((total, memory) => total + memory.salience, 0);
    return sum / filteredMemories.length;
  }, [filteredMemories]);

  return (
    <main>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", flexWrap: "wrap" }}>
        <div>
          <h1>Memory Review</h1>
          <p style={{ marginTop: "0.35rem", color: "var(--ink-soft)" }}>
            Alignment and drift inspection across repeated simulation rounds.
          </p>
        </div>
        <p className="code" style={{ color: "var(--ink-soft)", fontSize: "0.8rem" }}>
          latest cycle: {latestCycleQuery.data?.cycle_number ?? "-"}
        </p>
      </header>

      <div style={{ marginTop: "1rem", display: "grid", gap: "0.9rem", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
        <MetricCard label="memories visible" value={String(filteredMemories.length)} />
        <MetricCard label="avg salience" value={avgSalience.toFixed(2)} />
        <MetricCard label="alignment score" value={`${Math.round(alignmentScore * 100)}%`} />
        <MetricCard label="alignment state" value={alignmentLabel} />
      </div>

      <div style={{ marginTop: "1rem", display: "grid", gap: "0.9rem" }}>
        <Panel
          title="Memory Timeline"
          rightSlot={
            <label style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
              <span className="code" style={{ fontSize: "0.72rem" }}>
                agent
              </span>
              <select
                value={agentFilter}
                onChange={(event) => setAgentFilter(event.target.value)}
                style={{
                  border: "1px solid var(--line)",
                  background: "var(--bg-elev)",
                  borderRadius: "0.45rem",
                  padding: "0.25rem 0.45rem",
                }}
              >
                <option value="all">all</option>
                {agents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name}
                  </option>
                ))}
              </select>
            </label>
          }
        >
          <DataTable
            rows={memoryTimelineRows}
            emptyLabel="No memory entries yet. Run a cycle."
            columns={[
              { key: "agent_name", label: "Agent", noWrap: true },
              { key: "memory_type", label: "Type", noWrap: true },
              { key: "salience", label: "Salience", noWrap: true },
              { key: "content", label: "Content" },
              { key: "created_at", label: "Created" },
            ]}
          />
        </Panel>

        <Panel title="Drift Review (Agent Memory Summaries)">
          <DataTable
            rows={driftRows}
            emptyLabel="No agent summaries yet."
            columns={[
              { key: "agent_name", label: "Agent", noWrap: true },
              { key: "memory_summary", label: "Latest Memory Summary" },
            ]}
          />
        </Panel>

        <Panel title="Feed vs Memory Mismatch">
          <DataTable
            rows={mismatchRows}
            emptyLabel="No comparison data yet."
            columns={[
              { key: "agent_name", label: "Agent", noWrap: true },
              { key: "latest_post", label: "Latest Feed Post" },
              { key: "latest_memory", label: "Latest Memory" },
              { key: "overlap", label: "Token Overlap", noWrap: true },
              { key: "verdict", label: "Verdict", noWrap: true },
            ]}
          />
        </Panel>
      </div>
    </main>
  );
}

function tokenOverlap(a: string, b: string): number {
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

function normalize(input: string): string[] {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 4);
}

function excerpt(value: string): string {
  if (value.length <= 72) {
    return value;
  }

  return `${value.slice(0, 69)}...`;
}

function formatIso(value: string): string {
  return new Date(value).toLocaleString();
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ border: "1px solid var(--line)", background: "var(--bg-elev)", borderRadius: "0.75rem", padding: "0.75rem" }}>
      <p className="code" style={{ fontSize: "0.7rem", color: "var(--ink-soft)" }}>
        {label}
      </p>
      <p style={{ marginTop: "0.25rem", fontWeight: 700, fontSize: "1.08rem" }}>{value}</p>
    </div>
  );
}
