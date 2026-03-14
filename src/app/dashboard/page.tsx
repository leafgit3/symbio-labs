"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  fetchAgents,
  fetchEvents,
  fetchFeed,
  fetchLatestCycle,
  fetchLatestRunSummary,
  fetchWorldBriefConfig,
  fetchWorldStateCurrent,
  saveWorldBriefConfig,
  triggerCycle,
} from "@/lib/api/client";
import { DataTable } from "@/components/dashboard/table";
import { Panel } from "@/components/dashboard/panel";

export default function DashboardPage() {
  const queryClient = useQueryClient();
  const [worldBriefOverride, setWorldBriefOverride] = useState<string | null>(null);

  const worldQuery = useQuery({ queryKey: ["world"], queryFn: fetchWorldStateCurrent });
  const agentsQuery = useQuery({ queryKey: ["agents"], queryFn: fetchAgents });
  const feedQuery = useQuery({ queryKey: ["feed"], queryFn: fetchFeed });
  const eventsQuery = useQuery({ queryKey: ["events"], queryFn: fetchEvents });
  const latestCycleQuery = useQuery({ queryKey: ["latest-cycle"], queryFn: fetchLatestCycle });
  const latestRunSummaryQuery = useQuery({ queryKey: ["latest-run-summary"], queryFn: fetchLatestRunSummary });
  const worldBriefQuery = useQuery({ queryKey: ["world-brief"], queryFn: fetchWorldBriefConfig });

  const worldBriefDraft = worldBriefOverride ?? worldBriefQuery.data?.worldBrief ?? "";

  const runCycleMutation = useMutation({
    mutationFn: triggerCycle,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["world"] }),
        queryClient.invalidateQueries({ queryKey: ["agents"] }),
        queryClient.invalidateQueries({ queryKey: ["feed"] }),
        queryClient.invalidateQueries({ queryKey: ["events"] }),
        queryClient.invalidateQueries({ queryKey: ["agent-memories"] }),
        queryClient.invalidateQueries({ queryKey: ["latest-cycle"] }),
        queryClient.invalidateQueries({ queryKey: ["latest-run-summary"] }),
      ]);
    },
  });

  const saveWorldBriefMutation = useMutation({
    mutationFn: saveWorldBriefConfig,
    onSuccess: async () => {
      setWorldBriefOverride(null);
      await queryClient.invalidateQueries({ queryKey: ["world-brief"] });
    },
  });

  const loading =
    worldQuery.isLoading ||
    agentsQuery.isLoading ||
    feedQuery.isLoading ||
    eventsQuery.isLoading ||
    latestCycleQuery.isLoading ||
    latestRunSummaryQuery.isLoading ||
    worldBriefQuery.isLoading;

  return (
    <main>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: "1rem", flexWrap: "wrap" }}>
        <div>
          <h1>Lunar Citadel Dashboard</h1>
          <p style={{ marginTop: "0.35rem", color: "var(--ink-soft)" }}>
            Debug-first observability surface for v0 simulation loop.
          </p>
        </div>
      </header>

      {loading ? <p style={{ marginTop: "1rem" }}>Loading state...</p> : null}

      <div className="dashboard-top-grid">
        <Panel title="Cycle Control + World Brief" className="dashboard-control-card">
          <p style={{ color: "var(--ink-soft)", fontSize: "0.9rem" }}>
            Run one orchestration round and refresh all views.
          </p>
          <button
            type="button"
            onClick={() => runCycleMutation.mutate()}
            disabled={runCycleMutation.isPending}
            style={{
              marginTop: "0.7rem",
              border: "1px solid var(--line)",
              background: "var(--accent)",
              color: "var(--accent-ink)",
              borderRadius: "0.5rem",
              padding: "0.55rem 0.9rem",
              cursor: "pointer",
            }}
          >
            {runCycleMutation.isPending ? "Running cycle..." : "Run Cycle"}
          </button>
          {runCycleMutation.error ? (
            <p style={{ marginTop: "0.5rem", color: "#ff8a8a", fontSize: "0.82rem" }}>
              Cycle run failed. Check server logs for details.
            </p>
          ) : null}

          <p style={{ marginTop: "1rem", color: "var(--ink-soft)", fontSize: "0.9rem" }}>
            Scenario context used by agent decisions each cycle.
          </p>
          <textarea
            value={worldBriefDraft}
            onChange={(event) => setWorldBriefOverride(event.target.value)}
            rows={6}
            style={{
              marginTop: "0.7rem",
              width: "100%",
              border: "1px solid var(--line)",
              background: "var(--bg-elev)",
              color: "var(--ink)",
              borderRadius: "0.5rem",
              padding: "0.6rem",
              resize: "vertical",
            }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.8rem", marginTop: "0.6rem" }}>
            <button
              type="button"
              onClick={() => saveWorldBriefMutation.mutate(worldBriefDraft)}
              disabled={saveWorldBriefMutation.isPending || worldBriefDraft.trim().length < 5}
              style={{
                border: "1px solid var(--line)",
                background: "var(--bg)",
                color: "var(--ink)",
                borderRadius: "0.5rem",
                padding: "0.45rem 0.8rem",
                cursor: "pointer",
              }}
            >
              {saveWorldBriefMutation.isPending ? "Saving..." : "Save Brief"}
            </button>
            <span className="code" style={{ fontSize: "0.72rem", color: "var(--ink-soft)" }}>
              updated: {formatIso(worldBriefQuery.data?.updatedAt ?? null)}
            </span>
          </div>
        </Panel>

        <Panel title="World State">
          <p>
            <span className="code">cycle:</span> {worldQuery.data?.cycle_number}
          </p>
          <p style={{ marginTop: "0.4rem", color: "var(--ink-soft)" }}>{worldQuery.data?.summary}</p>
          <div style={{ marginTop: "0.65rem", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.5rem" }}>
            <Metric label="cohesion" value={worldQuery.data?.cohesion ?? 0} />
            <Metric label="trust" value={worldQuery.data?.trust ?? 0} />
            <Metric label="noise" value={worldQuery.data?.noise ?? 0} />
          </div>
        </Panel>

        <Panel title="Latest Cycle">
          <p>
            <span className="code">status:</span> {latestCycleQuery.data?.status}
          </p>
          <p style={{ marginTop: "0.4rem", color: "var(--ink-soft)" }}>{latestCycleQuery.data?.summary}</p>
          <p style={{ marginTop: "0.4rem" }}>
            <span className="code">started:</span> {formatIso(latestCycleQuery.data?.started_at ?? null)}
          </p>
          <p style={{ marginTop: "0.4rem" }}>
            <span className="code">finished:</span> {formatIso(latestCycleQuery.data?.finished_at ?? null)}
          </p>
          <p style={{ marginTop: "0.55rem" }}>
            <span className="code">scenario:</span> {latestRunSummaryQuery.data?.scenarioLabel ?? "-"}
          </p>
          <p style={{ marginTop: "0.35rem" }}>
            <span className="code">delta:</span>{" "}
            {latestRunSummaryQuery.data
              ? `c${formatDelta(latestRunSummaryQuery.data.delta.cohesion)} t${formatDelta(latestRunSummaryQuery.data.delta.trust)} n${formatDelta(latestRunSummaryQuery.data.delta.noise)}`
              : "-"}
          </p>
          <p style={{ marginTop: "0.35rem" }}>
            <span className="code">posts:</span> {latestRunSummaryQuery.data?.postsCreated ?? "-"}
          </p>
        </Panel>
      </div>

      <div style={{ marginTop: "1rem", display: "grid", gap: "0.9rem" }}>
        <Panel title="Agents">
          <DataTable
            rows={agentsQuery.data ?? []}
            emptyLabel="No agents yet."
            columns={[
              { key: "name", label: "Name" },
              { key: "role", label: "Role" },
              { key: "status", label: "Status" },
              {
                key: "memory_summary",
                label: "Memory Summary",
              },
            ]}
          />
        </Panel>

        <Panel title="Feed Posts">
          <DataTable
            rows={feedQuery.data ?? []}
            emptyLabel="No feed posts yet."
            columns={[
              { key: "cycle_number", label: "Cycle" },
              { key: "agent_id", label: "Agent ID" },
              { key: "post_type", label: "Type" },
              { key: "content", label: "Content" },
              {
                key: "created_at",
                label: "Created",
                render: (row) => formatIso(String(row.created_at)),
              },
            ]}
          />
        </Panel>

        <Panel title="Event Logs">
          <DataTable
            rows={eventsQuery.data ?? []}
            emptyLabel="No event logs yet."
            columns={[
              { key: "cycle_number", label: "Cycle" },
              { key: "event_type", label: "Type" },
              { key: "summary", label: "Summary" },
              {
                key: "created_at",
                label: "Created",
                render: (row) => formatIso(String(row.created_at)),
              },
            ]}
          />
        </Panel>
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ border: "1px solid var(--line)", borderRadius: "0.5rem", padding: "0.55rem" }}>
      <p className="code" style={{ fontSize: "0.72rem", color: "var(--ink-soft)" }}>
        {label}
      </p>
      <p style={{ fontSize: "1.1rem", fontWeight: 700 }}>{value.toFixed(1)}</p>
    </div>
  );
}

function formatIso(value: string | null | undefined): string {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleString();
}

function formatDelta(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}`;
}
