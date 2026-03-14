"use client";

import { CSSProperties, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DataTable } from "@/components/dashboard/table";
import { Panel } from "@/components/dashboard/panel";
import {
  createAgent,
  fetchAgentMemories,
  fetchAgents,
  fetchLatestCycle,
  updateAgent as updateAgentRequest,
} from "@/lib/api/client";
import { Agent, AgentMemory, CreateAgentInput, UpdateAgentInput } from "@/lib/schemas";

const EMPTY_AGENTS: Agent[] = [];
const EMPTY_MEMORIES: AgentMemory[] = [];

type AgentFormState = {
  name: string;
  role: string;
  goalsText: string;
  traitsText: string;
  memorySummary: string;
};

const DEFAULT_CREATE_FORM: AgentFormState = {
  name: "",
  role: "",
  goalsText: "",
  traitsText: "",
  memorySummary: "",
};

export default function AgentsPage() {
  const queryClient = useQueryClient();
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState<AgentFormState>(DEFAULT_CREATE_FORM);
  const [editForm, setEditForm] = useState<AgentFormState | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

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
  const selectedAgentForm = selectedAgent ? toAgentFormState(selectedAgent) : null;
  const activeEditForm = editForm ?? selectedAgentForm;

  const patchEditForm = (patch: Partial<AgentFormState>) => {
    setEditForm((prev) => {
      const base = prev ?? selectedAgentForm;
      if (!base) {
        return prev;
      }

      return { ...base, ...patch };
    });
  };

  const agentMemories = useMemo(() => {
    if (!selectedAgent) {
      return [];
    }

    return (memoriesQuery.data ?? EMPTY_MEMORIES)
      .filter((memory) => memory.agent_id === selectedAgent.id)
      .slice(0, 12);
  }, [memoriesQuery.data, selectedAgent]);

  const createAgentMutation = useMutation({
    mutationFn: (payload: CreateAgentInput) => createAgent(payload),
    onMutate: () => {
      setFormError(null);
    },
    onSuccess: async (created) => {
      setCreateForm(DEFAULT_CREATE_FORM);
      setSelectedAgentId(created.id);
      setEditForm(toAgentFormState(created));
      await queryClient.invalidateQueries({ queryKey: ["agents"] });
    },
    onError: (error) => {
      setFormError(error instanceof Error ? error.message : "Failed to create agent.");
    },
  });

  const updateAgentMutation = useMutation({
    mutationFn: ({ agentId, payload }: { agentId: string; payload: UpdateAgentInput }) => updateAgentRequest(agentId, payload),
    onMutate: () => {
      setFormError(null);
    },
    onSuccess: async (updated) => {
      setEditForm(toAgentFormState(updated));
      await queryClient.invalidateQueries({ queryKey: ["agents"] });
    },
    onError: (error) => {
      setFormError(error instanceof Error ? error.message : "Failed to update agent.");
    },
  });

  return (
    <main>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", flexWrap: "wrap" }}>
        <div>
          <h1>Agents</h1>
          <p style={{ marginTop: "0.35rem", color: "var(--ink-soft)" }}>
            Create and tune agent profiles. Roles, goals, and traits shape behavior each cycle.
          </p>
        </div>
        <p className="code" style={{ color: "var(--ink-soft)", fontSize: "0.8rem" }}>
          latest cycle: {latestCycleQuery.data?.cycle_number ?? "-"}
        </p>
      </header>

      <div style={{ marginTop: "1rem", display: "grid", gap: "0.9rem", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
        <Panel title="Create Agent">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              createAgentMutation.mutate(toCreateInput(createForm));
            }}
            style={{ display: "grid", gap: "0.55rem" }}
          >
            <div style={{ display: "grid", gap: "0.55rem" }}>
              <label style={{ display: "grid", gap: "0.2rem", fontSize: "0.82rem", color: "var(--ink-soft)" }}>
                name
                <input
                  value={createForm.name}
                  onChange={(event) => setCreateForm((prev) => ({ ...prev, name: event.target.value }))}
                  style={inputStyle}
                  placeholder="agent name"
                />
              </label>
              <label style={{ display: "grid", gap: "0.2rem", fontSize: "0.82rem", color: "var(--ink-soft)" }}>
                role
                <input
                  value={createForm.role}
                  onChange={(event) => setCreateForm((prev) => ({ ...prev, role: event.target.value }))}
                  style={inputStyle}
                  placeholder="agent role"
                />
              </label>
              <label style={{ display: "grid", gap: "0.2rem", fontSize: "0.82rem", color: "var(--ink-soft)" }}>
                goals (comma-separated)
                <input
                  value={createForm.goalsText}
                  onChange={(event) => setCreateForm((prev) => ({ ...prev, goalsText: event.target.value }))}
                  style={inputStyle}
                  placeholder="stabilize trust, reduce misinformation"
                />
              </label>
              <label style={{ display: "grid", gap: "0.2rem", fontSize: "0.82rem", color: "var(--ink-soft)" }}>
                traits (comma-separated)
                <input
                  value={createForm.traitsText}
                  onChange={(event) => setCreateForm((prev) => ({ ...prev, traitsText: event.target.value }))}
                  style={inputStyle}
                  placeholder="calm, direct"
                />
              </label>
              <label style={{ display: "grid", gap: "0.2rem", fontSize: "0.82rem", color: "var(--ink-soft)" }}>
                memory summary
                <textarea
                  value={createForm.memorySummary}
                  onChange={(event) => setCreateForm((prev) => ({ ...prev, memorySummary: event.target.value }))}
                  rows={3}
                  style={{ ...inputStyle, resize: "vertical" }}
                />
              </label>
            </div>
            <button
              type="submit"
              disabled={createAgentMutation.isPending || createForm.name.trim().length < 2 || createForm.role.trim().length < 2}
              style={buttonStyle}
            >
              {createAgentMutation.isPending ? "Creating..." : "Create Agent"}
            </button>
          </form>
        </Panel>

        <Panel title="Edit Selected Agent">
          {selectedAgent && activeEditForm ? (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                updateAgentMutation.mutate({
                  agentId: selectedAgent.id,
                  payload: toUpdateInput(activeEditForm),
                });
              }}
              style={{ display: "grid", gap: "0.55rem" }}
            >
              <div style={{ display: "grid", gap: "0.55rem" }}>
                <label style={{ display: "grid", gap: "0.2rem", fontSize: "0.82rem", color: "var(--ink-soft)" }}>
                  name
                  <input
                    value={activeEditForm.name}
                    onChange={(event) => patchEditForm({ name: event.target.value })}
                    style={inputStyle}
                  />
                </label>
                <label style={{ display: "grid", gap: "0.2rem", fontSize: "0.82rem", color: "var(--ink-soft)" }}>
                  role
                  <input
                    value={activeEditForm.role}
                    onChange={(event) => patchEditForm({ role: event.target.value })}
                    style={inputStyle}
                  />
                </label>
                <label style={{ display: "grid", gap: "0.2rem", fontSize: "0.82rem", color: "var(--ink-soft)" }}>
                  goals (comma-separated)
                  <input
                    value={activeEditForm.goalsText}
                    onChange={(event) => patchEditForm({ goalsText: event.target.value })}
                    style={inputStyle}
                  />
                </label>
                <label style={{ display: "grid", gap: "0.2rem", fontSize: "0.82rem", color: "var(--ink-soft)" }}>
                  traits (comma-separated)
                  <input
                    value={activeEditForm.traitsText}
                    onChange={(event) => patchEditForm({ traitsText: event.target.value })}
                    style={inputStyle}
                  />
                </label>
                <label style={{ display: "grid", gap: "0.2rem", fontSize: "0.82rem", color: "var(--ink-soft)" }}>
                  memory summary
                  <textarea
                    value={activeEditForm.memorySummary}
                    onChange={(event) => patchEditForm({ memorySummary: event.target.value })}
                    rows={3}
                    style={{ ...inputStyle, resize: "vertical" }}
                  />
                </label>
              </div>
              <button type="submit" disabled={updateAgentMutation.isPending} style={buttonStyle}>
                {updateAgentMutation.isPending ? "Saving..." : "Save Agent"}
              </button>
            </form>
          ) : (
            <p style={{ color: "var(--ink-soft)" }}>Select an agent to edit.</p>
          )}
        </Panel>
      </div>

      {formError ? (
        <p style={{ marginTop: "0.7rem", color: "#ff8a8a", fontSize: "0.85rem" }}>
          {formError}
        </p>
      ) : null}

      <div style={{ marginTop: "1rem", display: "grid", gap: "0.9rem", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
        {agents.map((agent) => {
          const selected = selectedAgent?.id === agent.id;
          return (
            <button
              key={agent.id}
              type="button"
              onClick={() => {
                setSelectedAgentId(agent.id);
                setEditForm(toAgentFormState(agent));
              }}
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
              <span className="code">uuid:</span>{" "}
              <span className="code" style={{ fontSize: "0.75rem" }}>
                {selectedAgent.id}
              </span>
            </p>
            <p style={{ marginTop: "0.45rem" }}>
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
                { key: "memory_type", label: "Type", noWrap: true },
                {
                  key: "salience",
                  label: "Salience",
                  noWrap: true,
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

function toCreateInput(form: AgentFormState): CreateAgentInput {
  return {
    name: form.name.trim(),
    role: form.role.trim(),
    goals: splitComma(form.goalsText),
    traits: splitComma(form.traitsText),
    memory_summary: form.memorySummary.trim(),
  };
}

function toUpdateInput(form: AgentFormState): UpdateAgentInput {
  return {
    name: form.name.trim(),
    role: form.role.trim(),
    goals: splitComma(form.goalsText),
    traits: splitComma(form.traitsText),
    memory_summary: form.memorySummary.trim(),
  };
}

function toAgentFormState(agent: Agent): AgentFormState {
  return {
    name: agent.name,
    role: agent.role,
    goalsText: agent.goals.join(", "),
    traitsText: agent.traits.join(", "),
    memorySummary: agent.memory_summary,
  };
}

function splitComma(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function formatIso(value: string | null | undefined): string {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleString();
}

const inputStyle: CSSProperties = {
  width: "100%",
  border: "1px solid var(--line)",
  background: "var(--bg-elev)",
  color: "var(--ink)",
  borderRadius: "0.45rem",
  padding: "0.45rem 0.55rem",
};

const buttonStyle: CSSProperties = {
  border: "1px solid var(--line)",
  background: "var(--accent)",
  color: "var(--accent-ink)",
  borderRadius: "0.45rem",
  padding: "0.5rem 0.75rem",
  cursor: "pointer",
};
