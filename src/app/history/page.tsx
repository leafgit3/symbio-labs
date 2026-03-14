"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DataTable } from "@/components/dashboard/table";
import { Panel } from "@/components/dashboard/panel";
import { fetchCycleDetails, fetchCycleHistory } from "@/lib/api/client";

export default function HistoryPage() {
  const [selectedCycleOverride, setSelectedCycleOverride] = useState<number | null>(null);

  const historyQuery = useQuery({ queryKey: ["cycle-history"], queryFn: fetchCycleHistory });

  const selectedCycle = selectedCycleOverride ?? historyQuery.data?.[0]?.cycleRun.cycle_number ?? null;

  const detailsQuery = useQuery({
    queryKey: ["cycle-details", selectedCycle],
    queryFn: () => fetchCycleDetails(selectedCycle ?? 0),
    enabled: selectedCycle !== null,
  });

  const historyRows = useMemo(() => {
    return (historyQuery.data ?? []).map((item) => ({
      cycle_number: item.cycleRun.cycle_number,
      status: item.cycleRun.status,
      scenario: item.runSummary?.scenarioLabel ?? "-",
      posts: item.runSummary?.postsCreated ?? 0,
      delta: item.runSummary
        ? `c${formatDelta(item.runSummary.delta.cohesion)} t${formatDelta(item.runSummary.delta.trust)} n${formatDelta(item.runSummary.delta.noise)}`
        : "-",
      finished_at: formatIso(item.cycleRun.finished_at),
    }));
  }, [historyQuery.data]);

  return (
    <main>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", flexWrap: "wrap" }}>
        <div>
          <h1>History</h1>
          <p style={{ marginTop: "0.35rem", color: "var(--ink-soft)" }}>
            Inspect completed cycles, scenario inputs, and outcome diffs.
          </p>
        </div>
      </header>

      <div style={{ marginTop: "1rem", display: "grid", gap: "0.9rem", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))" }}>
        <Panel title="Cycle Runs">
          <div style={{ marginBottom: "0.6rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {(historyQuery.data ?? []).slice(0, 16).map((item) => {
              const cycle = item.cycleRun.cycle_number;
              const selected = selectedCycle === cycle;
              return (
                <button
                  key={cycle}
                  type="button"
                  onClick={() => setSelectedCycleOverride(cycle)}
                  style={{
                    border: selected ? "1px solid var(--accent)" : "1px solid var(--line)",
                    background: selected ? "color-mix(in srgb, var(--accent) 18%, var(--bg-elev) 82%)" : "var(--bg-elev)",
                    color: "var(--ink)",
                    borderRadius: "0.45rem",
                    padding: "0.3rem 0.55rem",
                    cursor: "pointer",
                    fontSize: "0.8rem",
                  }}
                >
                  cycle {cycle}
                </button>
              );
            })}
          </div>

          <DataTable
            rows={historyRows}
            emptyLabel="No cycles recorded yet."
            columns={[
              { key: "cycle_number", label: "Cycle" },
              { key: "status", label: "Status" },
              { key: "scenario", label: "Scenario" },
              { key: "posts", label: "Posts" },
              { key: "delta", label: "Delta" },
              { key: "finished_at", label: "Finished" },
            ]}
          />
        </Panel>

        <Panel title={selectedCycle !== null ? `Cycle ${selectedCycle} Details` : "Cycle Details"}>
          {detailsQuery.isLoading ? <p style={{ color: "var(--ink-soft)" }}>Loading details...</p> : null}

          {!detailsQuery.isLoading && !detailsQuery.data ? (
            <p style={{ color: "var(--ink-soft)" }}>Select a cycle to inspect details.</p>
          ) : null}

          {detailsQuery.data ? (
            <div style={{ display: "grid", gap: "0.85rem" }}>
              <div style={{ border: "1px solid var(--line)", borderRadius: "0.6rem", padding: "0.7rem" }}>
                <p>
                  <span className="code">scenario:</span> {detailsQuery.data.runSummary?.scenarioLabel ?? "-"}
                </p>
                <p style={{ marginTop: "0.35rem", color: "var(--ink-soft)", whiteSpace: "pre-wrap" }}>
                  {detailsQuery.data.runSummary?.worldBriefUsed ?? "-"}
                </p>
              </div>

              <div style={{ border: "1px solid var(--line)", borderRadius: "0.6rem", padding: "0.7rem" }}>
                <p>
                  <span className="code">world:</span> {detailsQuery.data.worldState?.summary ?? "-"}
                </p>
                <p style={{ marginTop: "0.35rem" }}>
                  <span className="code">delta:</span>{" "}
                  {detailsQuery.data.runSummary
                    ? `c${formatDelta(detailsQuery.data.runSummary.delta.cohesion)} t${formatDelta(detailsQuery.data.runSummary.delta.trust)} n${formatDelta(detailsQuery.data.runSummary.delta.noise)}`
                    : "-"}
                </p>
              </div>

              <div style={{ border: "1px solid var(--line)", borderRadius: "0.6rem", padding: "0.7rem", minWidth: 0 }}>
                <p style={{ marginBottom: "0.55rem" }}>
                  <span className="code">agents used</span>
                </p>
                <DataTable
                  rows={(detailsQuery.data.runSummary?.agentsUsed ?? []).map((agent) => ({
                    name: agent.name,
                    role: agent.role,
                    goals: agent.goals.join(", "),
                    traits: agent.traits.join(", "),
                  }))}
                  emptyLabel="No summary for this cycle."
                  columns={[
                    { key: "name", label: "Agent" },
                    { key: "role", label: "Role" },
                    { key: "goals", label: "Goals" },
                    { key: "traits", label: "Traits" },
                  ]}
                />
              </div>

              <div style={{ border: "1px solid var(--line)", borderRadius: "0.6rem", padding: "0.7rem" }}>
                <p>
                  <span className="code">feed posts:</span> {detailsQuery.data.feedPosts.length}
                </p>
                <p style={{ marginTop: "0.35rem" }}>
                  <span className="code">events:</span> {detailsQuery.data.eventLogs.length}
                </p>
                <p style={{ marginTop: "0.35rem" }}>
                  <span className="code">memories:</span> {detailsQuery.data.memories.length}
                </p>
              </div>
            </div>
          ) : null}
        </Panel>
      </div>
    </main>
  );
}

function formatIso(value: string | null): string {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleString();
}

function formatDelta(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}`;
}
