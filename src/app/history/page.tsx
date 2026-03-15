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

  const llmFallbackRows = useMemo(() => {
    if (!detailsQuery.data) {
      return [];
    }

    return detailsQuery.data.eventLogs
      .filter((event) => event.event_type === "minor_event_created" && isLlmFallbackPayload(event.payload))
      .map((event) => {
        const payload = event.payload;

        return {
          created_at: formatIso(event.created_at),
          model: payload.llmModel ?? "-",
          error_code: payload.llmErrorCode ?? "-",
          detail: payload.llmErrorDetail ?? "-",
          action: `${payload.actionType ?? "-"} (${payload.stance ?? "-"})`,
        };
      });
  }, [detailsQuery.data]);

  return (
    <main>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", flexWrap: "wrap" }}>
        <div>
          <h1>History</h1>
          <p style={{ marginTop: "0.35rem", color: "var(--ink-soft)" }}>
            Review completed cycles for this active session, compare deltas, and inspect per-cycle details.
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
              { key: "cycle_number", label: "Cycle", noWrap: true },
              { key: "status", label: "Status", noWrap: true },
              { key: "scenario", label: "Scenario" },
              { key: "posts", label: "Posts", noWrap: true },
              { key: "delta", label: "Delta", noWrap: true },
              { key: "finished_at", label: "Finished" },
            ]}
          />
        </Panel>

        <Panel
          title={selectedCycle !== null ? `Cycle ${selectedCycle} Details` : "Cycle Details"}
          rightSlot={
            detailsQuery.data?.cycleRun?.status ? (
              <span style={badgeStyle(statusTone(detailsQuery.data.cycleRun.status))}>{detailsQuery.data.cycleRun.status}</span>
            ) : null
          }
        >
          {detailsQuery.isLoading ? <p style={{ color: "var(--ink-soft)" }}>Loading details...</p> : null}

          {!detailsQuery.isLoading && !detailsQuery.data ? (
            <p style={{ color: "var(--ink-soft)" }}>Select a cycle to inspect details.</p>
          ) : null}

          {detailsQuery.data ? (
            <div style={{ display: "grid", gap: "0.85rem" }}>
              <div style={{ border: "1px solid var(--line)", borderRadius: "0.6rem", padding: "0.7rem" }}>
                <p className="code" style={{ fontSize: "0.72rem", color: "var(--ink-soft)", marginBottom: "0.35rem" }}>
                  cycle summary
                </p>
                <p style={{ color: "var(--ink-soft)", lineHeight: 1.45 }}>{detailsQuery.data.cycleRun?.summary ?? "-"}</p>
              </div>

              <div style={{ marginTop: "0.05rem", display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "0.45rem" }}>
                <KeyValue label="started" value={formatIso(detailsQuery.data.cycleRun?.started_at ?? null)} />
                <KeyValue label="finished" value={formatIso(detailsQuery.data.cycleRun?.finished_at ?? null)} />
                <KeyValue label="scenario" value={detailsQuery.data.runSummary?.scenarioLabel ?? "-"} />
                <KeyValue label="posts" value={String(detailsQuery.data.runSummary?.postsCreated ?? "-")} />
              </div>

              <div style={{ border: "1px solid var(--line)", borderRadius: "0.6rem", padding: "0.7rem" }}>
                <p className="code" style={{ fontSize: "0.72rem", color: "var(--ink-soft)", marginBottom: "0.45rem" }}>
                  cycle delta
                </p>
                {detailsQuery.data.runSummary ? (
                  <div style={{ display: "flex", gap: "0.45rem", flexWrap: "wrap" }}>
                    <span style={badgeStyle(deltaTone("cohesion", detailsQuery.data.runSummary.delta.cohesion))}>
                      cohesion {formatDelta(detailsQuery.data.runSummary.delta.cohesion)}
                    </span>
                    <span style={badgeStyle(deltaTone("trust", detailsQuery.data.runSummary.delta.trust))}>
                      trust {formatDelta(detailsQuery.data.runSummary.delta.trust)}
                    </span>
                    <span style={badgeStyle(deltaTone("noise", detailsQuery.data.runSummary.delta.noise))}>
                      noise {formatDelta(detailsQuery.data.runSummary.delta.noise)}
                    </span>
                  </div>
                ) : (
                  <p style={{ color: "var(--ink-soft)" }}>No run summary yet.</p>
                )}
              </div>

              <div style={{ border: "1px solid var(--line)", borderRadius: "0.6rem", padding: "0.7rem" }}>
                <p className="code" style={{ fontSize: "0.72rem", color: "var(--ink-soft)", marginBottom: "0.45rem" }}>
                  diagnostics
                </p>
                {detailsQuery.data.runSummary?.diagnostics ? (
                  <div style={{ display: "grid", gap: "0.5rem" }}>
                    <div style={{ display: "flex", gap: "0.45rem", flexWrap: "wrap" }}>
                      <span style={badgeStyle("neutral")}>
                        organic e{detailsQuery.data.runSummary.diagnostics.stanceCounts.organic.escalate} c
                        {detailsQuery.data.runSummary.diagnostics.stanceCounts.organic.contain} m
                        {detailsQuery.data.runSummary.diagnostics.stanceCounts.organic.monitor}
                      </span>
                      <span style={badgeStyle("neutral")}>
                        effective e{detailsQuery.data.runSummary.diagnostics.stanceCounts.effective.escalate} c
                        {detailsQuery.data.runSummary.diagnostics.stanceCounts.effective.contain} m
                        {detailsQuery.data.runSummary.diagnostics.stanceCounts.effective.monitor}
                      </span>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "0.45rem" }}>
                      <KeyValue label="forced slots" value={String(detailsQuery.data.runSummary.diagnostics.forcedSlotsCount)} />
                      <KeyValue label="promoted events" value={String(detailsQuery.data.runSummary.diagnostics.promotedEventsCount)} />
                      <KeyValue label="contradiction" value={formatPercent(detailsQuery.data.runSummary.diagnostics.contradictionScore)} />
                      <KeyValue
                        label="salience avg/std"
                        value={`${detailsQuery.data.runSummary.diagnostics.salienceAvg.toFixed(2)} / ${detailsQuery.data.runSummary.diagnostics.salienceStdDev.toFixed(2)}`}
                      />
                      <KeyValue label="llm fallback turns" value={String(detailsQuery.data.runSummary.diagnostics.llmFallbackCount ?? "-")} />
                      <KeyValue label="llm successful turns" value={String(detailsQuery.data.runSummary.diagnostics.llmSuccessCount ?? "-")} />
                    </div>
                  </div>
                ) : (
                  <p style={{ color: "var(--ink-soft)" }}>No diagnostics stored for this cycle.</p>
                )}
              </div>

              <div style={{ border: "1px solid var(--line)", borderRadius: "0.6rem", padding: "0.7rem" }}>
                <p className="code" style={{ fontSize: "0.72rem", color: "var(--ink-soft)", marginBottom: "0.45rem" }}>
                  llm fallback events
                </p>
                <DataTable
                  rows={llmFallbackRows}
                  emptyLabel="No LLM fallback events in this cycle."
                  columns={[
                    { key: "created_at", label: "Created", noWrap: true },
                    { key: "model", label: "Model", noWrap: true },
                    { key: "error_code", label: "Error", noWrap: true },
                    { key: "action", label: "Action", noWrap: true },
                    { key: "detail", label: "Detail" },
                  ]}
                />
              </div>

              <div style={{ border: "1px solid var(--line)", borderRadius: "0.6rem", padding: "0.7rem" }}>
                <p className="code" style={{ fontSize: "0.72rem", color: "var(--ink-soft)", marginBottom: "0.35rem" }}>
                  world brief
                </p>
                <p style={{ color: "var(--ink-soft)", whiteSpace: "pre-wrap", lineHeight: 1.45 }}>
                  {detailsQuery.data.runSummary?.worldBriefUsed ?? "-"}
                </p>
              </div>

              <div style={{ border: "1px solid var(--line)", borderRadius: "0.6rem", padding: "0.7rem" }}>
                <p className="code" style={{ fontSize: "0.72rem", color: "var(--ink-soft)", marginBottom: "0.35rem" }}>
                  world state
                </p>
                <p style={{ color: "var(--ink-soft)", lineHeight: 1.45 }}>{detailsQuery.data.worldState?.summary ?? "-"}</p>
                <div style={{ marginTop: "0.5rem", display: "flex", justifyContent: "flex-end" }}>
                  <span style={badgeStyle("neutral")}>active events: {detailsQuery.data.worldState?.active_events.length ?? 0}</span>
                </div>
              </div>

              <div style={{ border: "1px solid var(--line)", borderRadius: "0.6rem", padding: "0.7rem", minWidth: 0 }}>
                <p style={{ marginBottom: "0.55rem" }}>
                  <span className="code">agents used</span>
                </p>
                <DataTable
                  rows={(detailsQuery.data.runSummary?.agentsUsed ?? []).map((agent) => ({
                    name: agent.name,
                    stance: agent.stance ?? "-",
                    source: agent.stanceSource ?? "-",
                    role: agent.role,
                    goals: agent.goals.join(", "),
                    traits: agent.traits.join(", "),
                    fallback_reason: agent.fallbackReason ?? "-",
                  }))}
                  emptyLabel="No summary for this cycle."
                  columns={[
                    { key: "name", label: "Agent", noWrap: true },
                    { key: "stance", label: "Stance", noWrap: true },
                    { key: "source", label: "Source", noWrap: true },
                    { key: "role", label: "Role", noWrap: true },
                    { key: "goals", label: "Goals" },
                    { key: "traits", label: "Traits" },
                    { key: "fallback_reason", label: "Fallback Reason" },
                  ]}
                />
              </div>

              <div style={{ border: "1px solid var(--line)", borderRadius: "0.6rem", padding: "0.7rem" }}>
                <p className="code" style={{ fontSize: "0.72rem", color: "var(--ink-soft)", marginBottom: "0.45rem" }}>
                  cycle counts
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "0.45rem" }}>
                  <KeyValue label="feed posts" value={String(detailsQuery.data.feedPosts.length)} />
                  <KeyValue label="events" value={String(detailsQuery.data.eventLogs.length)} />
                  <KeyValue label="memories" value={String(detailsQuery.data.memories.length)} />
                </div>
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

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
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

function isLlmFallbackPayload(payload: Record<string, unknown>): payload is {
  kind: "llm_fallback";
  llmModel?: string;
  llmErrorCode?: string;
  llmErrorDetail?: string;
  actionType?: string;
  stance?: string;
} {
  return payload.kind === "llm_fallback";
}
