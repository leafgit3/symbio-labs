"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  fetchAgents,
  fetchCycleHistory,
  fetchEvents,
  fetchFeed,
  fetchLatestCycle,
  fetchLatestRunSummary,
  fetchWorldBriefConfig,
  fetchWorldStateCurrent,
  resetSimulation,
  saveWorldBriefConfig,
  triggerCycleWithInput,
} from "@/lib/api/client";
import { DataTable } from "@/components/dashboard/table";
import { Panel } from "@/components/dashboard/panel";

type ScenarioPreset = {
  id: string;
  scenarioLabel: string;
  worldBriefUsed: string;
  lastCycleNumber: number;
};

export default function DashboardPage() {
  const queryClient = useQueryClient();
  const [worldBriefOverride, setWorldBriefOverride] = useState<string | null>(null);
  const [scenarioLabel, setScenarioLabel] = useState("");
  const [scenarioPresetId, setScenarioPresetId] = useState("");

  const worldQuery = useQuery({ queryKey: ["world"], queryFn: fetchWorldStateCurrent });
  const agentsQuery = useQuery({ queryKey: ["agents"], queryFn: fetchAgents });
  const feedQuery = useQuery({ queryKey: ["feed"], queryFn: fetchFeed });
  const eventsQuery = useQuery({ queryKey: ["events"], queryFn: fetchEvents });
  const cycleHistoryQuery = useQuery({ queryKey: ["cycle-history"], queryFn: fetchCycleHistory });
  const latestCycleQuery = useQuery({ queryKey: ["latest-cycle"], queryFn: fetchLatestCycle });
  const latestRunSummaryQuery = useQuery({ queryKey: ["latest-run-summary"], queryFn: fetchLatestRunSummary });
  const worldBriefQuery = useQuery({ queryKey: ["world-brief"], queryFn: fetchWorldBriefConfig });

  const worldBriefDraft = worldBriefOverride ?? worldBriefQuery.data?.worldBrief ?? "";
  const agentsById = useMemo(() => {
    return new Map((agentsQuery.data ?? []).map((agent) => [agent.id, agent.name]));
  }, [agentsQuery.data]);
  const feedRows = useMemo(() => {
    return (feedQuery.data ?? []).map((post) => ({
      ...post,
      agent_name: agentsById.get(post.agent_id) ?? post.agent_id,
    }));
  }, [agentsById, feedQuery.data]);
  const scenarioPresets = useMemo<ScenarioPreset[]>(() => {
    const presets: ScenarioPreset[] = [];
    const seen = new Set<string>();

    for (const item of cycleHistoryQuery.data ?? []) {
      const runSummary = item.runSummary;
      if (!runSummary) {
        continue;
      }

      const signature = `${runSummary.scenarioLabel}::${runSummary.worldBriefUsed}`;
      if (seen.has(signature)) {
        continue;
      }

      seen.add(signature);
      presets.push({
        id: signature,
        scenarioLabel: runSummary.scenarioLabel,
        worldBriefUsed: runSummary.worldBriefUsed,
        lastCycleNumber: runSummary.cycleNumber,
      });
    }

    return presets;
  }, [cycleHistoryQuery.data]);

  const runCycleMutation = useMutation({
    mutationFn: async () => {
      return triggerCycleWithInput({
        scenarioLabel: scenarioLabel.trim() || undefined,
        worldBrief: worldBriefDraft.trim() || undefined,
      });
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["world"] }),
        queryClient.invalidateQueries({ queryKey: ["agents"] }),
        queryClient.invalidateQueries({ queryKey: ["feed"] }),
        queryClient.invalidateQueries({ queryKey: ["events"] }),
        queryClient.invalidateQueries({ queryKey: ["agent-memories"] }),
        queryClient.invalidateQueries({ queryKey: ["latest-cycle"] }),
        queryClient.invalidateQueries({ queryKey: ["latest-run-summary"] }),
        queryClient.invalidateQueries({ queryKey: ["cycle-history"] }),
      ]);
    },
  });

  const resetSimulationMutation = useMutation({
    mutationFn: resetSimulation,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["world"] }),
        queryClient.invalidateQueries({ queryKey: ["agents"] }),
        queryClient.invalidateQueries({ queryKey: ["feed"] }),
        queryClient.invalidateQueries({ queryKey: ["events"] }),
        queryClient.invalidateQueries({ queryKey: ["agent-memories"] }),
        queryClient.invalidateQueries({ queryKey: ["latest-cycle"] }),
        queryClient.invalidateQueries({ queryKey: ["latest-run-summary"] }),
        queryClient.invalidateQueries({ queryKey: ["cycle-history"] }),
        queryClient.invalidateQueries({ queryKey: ["cycle-details"] }),
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
  const isCycleRunning = runCycleMutation.isPending;
  const latestDiagnostics = latestRunSummaryQuery.data?.diagnostics;

  function applyScenarioPreset(presetId: string) {
    setScenarioPresetId(presetId);

    if (!presetId) {
      return;
    }

    const selected = scenarioPresets.find((preset) => preset.id === presetId);
    if (!selected) {
      return;
    }

    setScenarioLabel(selected.scenarioLabel);
    setWorldBriefOverride(selected.worldBriefUsed);
  }

  return (
    <main>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: "1rem", flexWrap: "wrap" }}>
        <div>
          <h1>Lunar Citadel Dashboard</h1>
          <p style={{ marginTop: "0.35rem", color: "var(--ink-soft)" }}>
            Run simulation cycles and monitor world state, feed activity, and latest outcomes.
          </p>
        </div>
      </header>

      {loading ? <p style={{ marginTop: "1rem" }}>Loading state...</p> : null}

      <div className="dashboard-top-grid">
        <Panel title="Cycle Control + World Brief" className="dashboard-control-card">
          <p style={{ color: "var(--ink-soft)", fontSize: "0.9rem" }}>
            Run one orchestration round and refresh all views.
          </p>
          <p style={{ marginTop: "0.35rem", color: "var(--ink-soft)", fontSize: "0.74rem" }}>
            Presets are learned from completed runs in the active session.
          </p>
          <div style={{ marginTop: "0.7rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => runCycleMutation.mutate()}
              disabled={runCycleMutation.isPending || resetSimulationMutation.isPending}
              style={{
                border: "1px solid var(--line)",
                background: "var(--accent)",
                color: "var(--accent-ink)",
                borderRadius: "0.5rem",
                padding: "0.55rem 0.9rem",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.45rem",
                opacity: runCycleMutation.isPending ? 0.92 : 1,
              }}
            >
              {runCycleMutation.isPending ? (
                <>
                  <InlineSpinner />
                  Running cycle...
                </>
              ) : (
                "Run Cycle"
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                if (
                  !window.confirm(
                    "Start a new simulation session? The active dashboard/feed/history will reset to baseline, while previous sessions remain stored in the database.",
                  )
                ) {
                  return;
                }

                resetSimulationMutation.mutate();
              }}
              disabled={runCycleMutation.isPending || resetSimulationMutation.isPending}
              style={{
                border: "1px solid color-mix(in srgb, #d06a6a 60%, var(--line) 40%)",
                background: "color-mix(in srgb, #d06a6a 20%, var(--bg-elev) 80%)",
                color: "var(--ink)",
                borderRadius: "0.5rem",
                padding: "0.55rem 0.9rem",
                cursor: "pointer",
              }}
            >
              {resetSimulationMutation.isPending ? "Resetting..." : "Reset Simulation"}
            </button>
          </div>
          {runCycleMutation.error ? (
            <p style={{ marginTop: "0.5rem", color: "#ff8a8a", fontSize: "0.82rem" }}>
              Cycle run failed. Check server logs for details.
            </p>
          ) : null}

          {resetSimulationMutation.error ? (
            <p style={{ marginTop: "0.5rem", color: "#ff8a8a", fontSize: "0.82rem" }}>
              Reset failed. Check server logs for details.
            </p>
          ) : null}

          <div style={{ marginTop: "0.9rem", display: "grid", gap: "0.5rem" }}>
            <label style={{ fontSize: "0.82rem", color: "var(--ink-soft)" }}>
              scenario preset
              <select
                value={scenarioPresetId}
                onChange={(event) => applyScenarioPreset(event.target.value)}
                style={{
                  marginTop: "0.25rem",
                  width: "100%",
                  border: "1px solid var(--line)",
                  background: "var(--bg-elev)",
                  color: "var(--ink)",
                  borderRadius: "0.45rem",
                  padding: "0.45rem 0.55rem",
                }}
              >
                <option value="">custom / manual</option>
                {scenarioPresets.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.scenarioLabel} (cycle {preset.lastCycleNumber})
                  </option>
                ))}
              </select>
            </label>
            <label style={{ fontSize: "0.82rem", color: "var(--ink-soft)" }}>
              scenario label
              <input
                value={scenarioLabel}
                onChange={(event) => {
                  setScenarioLabel(event.target.value);
                  setScenarioPresetId("");
                }}
                placeholder="default"
                style={{
                  marginTop: "0.25rem",
                  width: "100%",
                  border: "1px solid var(--line)",
                  background: "var(--bg-elev)",
                  color: "var(--ink)",
                  borderRadius: "0.45rem",
                  padding: "0.45rem 0.55rem",
                }}
              />
            </label>
          </div>

          <p style={{ marginTop: "1rem", color: "var(--ink-soft)", fontSize: "0.9rem" }}>
            Scenario context used by agent decisions each cycle.
          </p>
          <textarea
            value={worldBriefDraft}
            onChange={(event) => {
              setWorldBriefOverride(event.target.value);
              setScenarioPresetId("");
            }}
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

        <Panel
          title="World State"
          rightSlot={
            <span style={badgeStyle("neutral")}>
              cycle {worldQuery.data?.cycle_number ?? "-"}
            </span>
          }
        >
          <div style={{ border: "1px solid var(--line)", borderRadius: "0.55rem", padding: "0.6rem" }}>
            <p className="code" style={{ fontSize: "0.72rem", color: "var(--ink-soft)", marginBottom: "0.35rem" }}>
              current summary
            </p>
            <p style={{ color: "var(--ink-soft)", lineHeight: 1.45 }}>{worldQuery.data?.summary ?? "-"}</p>
          </div>

          <div style={{ marginTop: "0.6rem", display: "flex", gap: "0.45rem", flexWrap: "wrap", justifyContent: "flex-end" }}>
            <span style={badgeStyle("neutral")}>active events: {worldQuery.data?.active_events.length ?? 0}</span>
          </div>

          <div style={{ marginTop: "0.65rem", display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "0.5rem" }}>
            <Metric label="cohesion" value={worldQuery.data?.cohesion ?? 0} tone={scoreTone("cohesion", worldQuery.data?.cohesion ?? 0)} />
            <Metric label="trust" value={worldQuery.data?.trust ?? 0} tone={scoreTone("trust", worldQuery.data?.trust ?? 0)} />
            <Metric label="noise" value={worldQuery.data?.noise ?? 0} tone={scoreTone("noise", worldQuery.data?.noise ?? 0)} />
          </div>
        </Panel>

        <Panel
          title="Latest Cycle"
          rightSlot={<span style={badgeStyle(statusTone(latestCycleQuery.data?.status))}>{latestCycleQuery.data?.status ?? "-"}</span>}
        >
          <div style={{ border: "1px solid var(--line)", borderRadius: "0.55rem", padding: "0.6rem" }}>
            <p className="code" style={{ fontSize: "0.72rem", color: "var(--ink-soft)", marginBottom: "0.35rem" }}>
              cycle summary
            </p>
            <p style={{ color: "var(--ink-soft)", lineHeight: 1.45 }}>{latestCycleQuery.data?.summary ?? "-"}</p>
          </div>

          <div style={{ marginTop: "0.65rem", display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "0.45rem" }}>
            <KeyValue label="started" value={formatIso(latestCycleQuery.data?.started_at ?? null)} />
            <KeyValue label="finished" value={formatIso(latestCycleQuery.data?.finished_at ?? null)} />
            <KeyValue label="scenario" value={latestRunSummaryQuery.data?.scenarioLabel ?? "-"} />
            <KeyValue label="posts" value={String(latestRunSummaryQuery.data?.postsCreated ?? "-")} />
          </div>

          <div style={{ marginTop: "0.65rem", border: "1px solid var(--line)", borderRadius: "0.55rem", padding: "0.6rem" }}>
            <p className="code" style={{ fontSize: "0.72rem", color: "var(--ink-soft)", marginBottom: "0.45rem" }}>
              cycle delta
            </p>
            {latestRunSummaryQuery.data ? (
              <div style={{ display: "flex", gap: "0.45rem", flexWrap: "wrap" }}>
                <span style={badgeStyle(deltaTone("cohesion", latestRunSummaryQuery.data.delta.cohesion))}>
                  cohesion {formatDelta(latestRunSummaryQuery.data.delta.cohesion)}
                </span>
                <span style={badgeStyle(deltaTone("trust", latestRunSummaryQuery.data.delta.trust))}>
                  trust {formatDelta(latestRunSummaryQuery.data.delta.trust)}
                </span>
                <span style={badgeStyle(deltaTone("noise", latestRunSummaryQuery.data.delta.noise))}>
                  noise {formatDelta(latestRunSummaryQuery.data.delta.noise)}
                </span>
              </div>
            ) : (
              <p style={{ color: "var(--ink-soft)" }}>No run summary yet.</p>
            )}
          </div>

          <div style={{ marginTop: "0.65rem", border: "1px solid var(--line)", borderRadius: "0.55rem", padding: "0.6rem" }}>
            <p className="code" style={{ fontSize: "0.72rem", color: "var(--ink-soft)", marginBottom: "0.45rem" }}>
              cycle diagnostics
            </p>
            {latestDiagnostics ? (
              <div style={{ display: "grid", gap: "0.45rem" }}>
                <div style={{ display: "flex", gap: "0.45rem", flexWrap: "wrap" }}>
                  <span style={badgeStyle("neutral")}>
                    stance organic e{latestDiagnostics.stanceCounts.organic.escalate} c{latestDiagnostics.stanceCounts.organic.contain} m
                    {latestDiagnostics.stanceCounts.organic.monitor}
                  </span>
                  <span style={badgeStyle("neutral")}>
                    stance effective e{latestDiagnostics.stanceCounts.effective.escalate} c{latestDiagnostics.stanceCounts.effective.contain} m
                    {latestDiagnostics.stanceCounts.effective.monitor}
                  </span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "0.45rem" }}>
                  <KeyValue label="forced slots" value={String(latestDiagnostics.forcedSlotsCount)} />
                  <KeyValue label="promoted events" value={String(latestDiagnostics.promotedEventsCount)} />
                  <KeyValue label="contradiction" value={formatPercent(latestDiagnostics.contradictionScore)} />
                  <KeyValue label="salience avg/std" value={`${latestDiagnostics.salienceAvg.toFixed(2)} / ${latestDiagnostics.salienceStdDev.toFixed(2)}`} />
                </div>
              </div>
            ) : (
              <p style={{ color: "var(--ink-soft)" }}>No diagnostics yet.</p>
            )}
          </div>
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
            rows={feedRows}
            emptyLabel="No feed posts yet."
            columns={[
              { key: "cycle_number", label: "Cycle", noWrap: true },
              { key: "agent_name", label: "Agent", noWrap: true },
              { key: "post_type", label: "Type", noWrap: true },
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
              { key: "cycle_number", label: "Cycle", noWrap: true },
              { key: "event_type", label: "Type", noWrap: true },
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

      {isCycleRunning ? (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: "fixed",
            right: "1rem",
            bottom: "1rem",
            zIndex: 50,
            border: "1px solid var(--line)",
            borderRadius: "0.6rem",
            background: "color-mix(in srgb, var(--bg-elev) 92%, var(--accent) 8%)",
            boxShadow: "0 12px 24px rgba(0, 0, 0, 0.24)",
            padding: "0.7rem 0.8rem",
            maxWidth: "min(92vw, 360px)",
          }}
        >
          <p style={{ display: "flex", alignItems: "center", gap: "0.45rem", fontSize: "0.86rem", fontWeight: 600, margin: 0 }}>
            <InlineSpinner />
            Orchestration running
          </p>
          <p style={{ marginTop: "0.35rem", marginBottom: 0, fontSize: "0.78rem", color: "var(--ink-soft)", lineHeight: 1.35 }}>
            Generating agent turns, feed posts, memories, and world updates.
          </p>
        </div>
      ) : null}

      <style jsx global>{`
        @keyframes dashboard-spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </main>
  );
}

function InlineSpinner({ size = 14 }: { size?: number }) {
  return (
    <span
      aria-hidden="true"
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: "999px",
        border: "2px solid color-mix(in srgb, var(--line) 72%, transparent 28%)",
        borderTopColor: "var(--accent)",
        animation: "dashboard-spin 0.8s linear infinite",
        display: "inline-block",
        flex: "0 0 auto",
      }}
    />
  );
}

function KeyValue({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ border: "1px solid var(--line)", borderRadius: "0.45rem", padding: "0.45rem 0.5rem" }}>
      <p className="code" style={{ fontSize: "0.7rem", color: "var(--ink-soft)" }}>
        {label}
      </p>
      <p style={{ marginTop: "0.2rem", fontSize: "0.86rem", overflowWrap: "anywhere" }}>{value}</p>
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: number; tone: Tone }) {
  return (
    <div style={{ border: "1px solid var(--line)", borderRadius: "0.5rem", padding: "0.55rem", background: toneBackground(tone) }}>
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

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

type Tone = "positive" | "warning" | "negative" | "neutral";

function badgeStyle(tone: Tone): React.CSSProperties {
  return {
    border: "1px solid var(--line)",
    borderRadius: "999px",
    padding: "0.2rem 0.5rem",
    fontSize: "0.75rem",
    fontFamily: "var(--font-space-mono), monospace",
    background: toneBackground(tone),
    color: "var(--ink)",
    whiteSpace: "nowrap",
  };
}

function toneBackground(tone: Tone): string {
  if (tone === "positive") {
    return "color-mix(in srgb, var(--accent) 28%, var(--bg-elev) 72%)";
  }

  if (tone === "warning") {
    return "color-mix(in srgb, #f2b84a 24%, var(--bg-elev) 76%)";
  }

  if (tone === "negative") {
    return "color-mix(in srgb, #d06a6a 24%, var(--bg-elev) 76%)";
  }

  return "color-mix(in srgb, var(--line) 30%, var(--bg-elev) 70%)";
}

function statusTone(status: string | undefined): Tone {
  if (status === "completed") {
    return "positive";
  }

  if (status === "running") {
    return "warning";
  }

  if (status === "failed") {
    return "negative";
  }

  return "neutral";
}

function scoreTone(metric: "cohesion" | "trust" | "noise", value: number): Tone {
  if (metric === "noise") {
    if (value <= 35) {
      return "positive";
    }

    if (value <= 60) {
      return "warning";
    }

    return "negative";
  }

  if (value >= 65) {
    return "positive";
  }

  if (value >= 40) {
    return "warning";
  }

  return "negative";
}

function deltaTone(metric: "cohesion" | "trust" | "noise", value: number): Tone {
  if (metric === "noise") {
    if (value < -0.05) {
      return "positive";
    }

    if (value > 0.05) {
      return "negative";
    }

    return "neutral";
  }

  if (value > 0.05) {
    return "positive";
  }

  if (value < -0.05) {
    return "negative";
  }

  return "neutral";
}
