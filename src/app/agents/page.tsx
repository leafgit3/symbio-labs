"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DataTable } from "@/components/dashboard/table";
import { Panel } from "@/components/dashboard/panel";
import { fetchAgentMemories, fetchAgents, fetchLatestCycle } from "@/lib/api/client";
import { Agent, AgentMemory } from "@/lib/schemas";

const EMPTY_AGENTS: Agent[] = [];
const EMPTY_MEMORIES: AgentMemory[] = [];

export default function AgentsPage() {
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);

  const agentsQuery = useQuery({ queryKey: ["agents"], queryFn: fetchAgents });
  const memoriesQuery = useQuery({ queryKey: ["agent-memories"], queryFn: fetchAgentMemories });
  const latestCycleQuery = useQuery({ queryKey: ["latest-cycle"], queryFn: fetchLatestCycle });

  const agents = agentsQuery.data ?? EMPTY_AGENTS;
  const selectedAgent = useMemo(() => {
    if (selectedAgentId) {
      return agents.find((agent) => agent.id === selectedAgentId) ?? agents[0] ?? null;
    }

    return agents[0] ?? null;
  }, [agents, selectedAgentId]);

  const agentMemories = useMemo(() => {
    if (!selectedAgent) {
      return [];
    }

    return (memoriesQuery.data ?? EMPTY_MEMORIES)
      .filter((memory) => memory.agent_id === selectedAgent.id)
      .slice(0, 12);
  }, [memoriesQuery.data, selectedAgent]);

  return (
    <main>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", flexWrap: "wrap" }}>
        <div>
          <h1>Agents</h1>
          <p style={{ marginTop: "0.35rem", color: "var(--ink-soft)" }}>
            Agent identities, statuses, goals, and recent memory traces.
          </p>
        </div>
        <p className="code" style={{ color: "var(--ink-soft)", fontSize: "0.8rem" }}>
          latest cycle: {latestCycleQuery.data?.cycle_number ?? "-"}
        </p>
      </header>

      <div style={{ marginTop: "1rem", display: "grid", gap: "0.9rem", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
        {agents.map((agent) => {
          const selected = selectedAgent?.id === agent.id;
          return (
            <button
              key={agent.id}
              type="button"
              onClick={() => setSelectedAgentId(agent.id)}
              style={{
                textAlign: "left",
                border: selected ? "1px solid var(--accent)" : "1px solid var(--line)",
                background: "var(--bg-elev)",
                borderRadius: "0.75rem",
                padding: "0.9rem",
                cursor: "pointer",
              }}
            >
              <h2 style={{ fontSize: "1rem" }}>{agent.name}</h2>
              <p style={{ marginTop: "0.35rem", color: "var(--ink-soft)", fontSize: "0.9rem" }}>{agent.role}</p>
              <p style={{ marginTop: "0.55rem", fontSize: "0.83rem" }}>
                <span className="code">status:</span> {agent.status}
              </p>
              <p style={{ marginTop: "0.3rem", color: "var(--ink-soft)", fontSize: "0.82rem" }}>
                {agent.memory_summary}
              </p>
            </button>
          );
        })}
      </div>

      {selectedAgent ? (
        <div style={{ marginTop: "1rem", display: "grid", gap: "0.9rem" }}>
          <Panel title={`${selectedAgent.name} Profile`}>
            <p>
              <span className="code">role:</span> {selectedAgent.role}
            </p>
            <p style={{ marginTop: "0.45rem" }}>
              <span className="code">goals:</span> {selectedAgent.goals.join(", ")}
            </p>
            <p style={{ marginTop: "0.45rem" }}>
              <span className="code">traits:</span> {selectedAgent.traits.join(", ")}
            </p>
            <p style={{ marginTop: "0.45rem" }}>
              <span className="code">last action:</span> {formatIso(selectedAgent.last_action_at)}
            </p>
          </Panel>

          <Panel title="Recent Memory Entries">
            <DataTable
              rows={agentMemories}
              emptyLabel="No memory entries yet for this agent."
              columns={[
                { key: "memory_type", label: "Type" },
                {
                  key: "salience",
                  label: "Salience",
                  render: (row) => Number(row.salience).toFixed(2),
                },
                { key: "content", label: "Content" },
                {
                  key: "created_at",
                  label: "Created",
                  render: (row) => formatIso(String(row.created_at)),
                },
              ]}
            />
          </Panel>
        </div>
      ) : null}
    </main>
  );
}

function formatIso(value: string | null | undefined): string {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleString();
}
