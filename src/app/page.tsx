export default function HomePage() {
  return (
    <main>
      <header style={{ maxWidth: 820 }}>
        <h1>Symbio Labs Operating Manual</h1>
        <p style={{ color: "var(--ink-soft)", marginTop: "0.65rem", lineHeight: 1.5 }}>
          This app simulates multi-agent social dynamics over repeated cycles. Use it to test scenarios, inspect drift, and compare outcomes
          over time.
        </p>
      </header>

      <section style={{ marginTop: "1.2rem", display: "grid", gap: "0.7rem", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
        <InfoCard
          title="Use Case: Scenario Stress Test"
          body="Change world brief + scenario label, run multiple cycles, and compare whether trust/cohesion degrade or recover."
        />
        <InfoCard
          title="Use Case: Agent Behavior Tuning"
          body="Edit role, goals, and traits in Agents, then rerun and observe changes in feed posts, memories, and deltas."
        />
        <InfoCard
          title="Use Case: Drift Audits"
          body="Use Drift Review to compare what agents post publicly versus what they retain in memory summaries."
        />
      </section>

      <section style={{ marginTop: "1.2rem" }}>
        <h2 style={sectionTitleStyle}>Page Guide</h2>
        <div style={{ marginTop: "0.6rem", border: "1px solid var(--line)", borderRadius: "0.75rem", background: "var(--bg-elev)", padding: "0.8rem" }}>
          <ul style={{ marginLeft: "1rem", color: "var(--ink-soft)", lineHeight: 1.55, display: "grid", gap: "0.35rem" }}>
            <li>
              <strong style={{ color: "var(--ink)" }}>Dashboard:</strong> Run cycles, set world brief and scenario, apply scenario presets, and monitor latest world
              state.
            </li>
            <li>
              <strong style={{ color: "var(--ink)" }}>Agents:</strong> Create/edit agents. Agent profiles shape generated actions and memory updates each cycle.
            </li>
            <li>
              <strong style={{ color: "var(--ink)" }}>Feed:</strong> Chronological stream of generated posts by cycle and type (statement, signal, rumor, reaction, etc).
            </li>
            <li>
              <strong style={{ color: "var(--ink)" }}>Drift Review:</strong> Inspect memory timeline, drift summaries, and feed-vs-memory mismatch signals.
            </li>
            <li>
              <strong style={{ color: "var(--ink)" }}>History:</strong> Review completed cycles in the active session with per-cycle deltas and world brief used.
            </li>
          </ul>
        </div>
      </section>

      <section style={{ marginTop: "1.2rem" }}>
        <h2 style={sectionTitleStyle}>Cycle Delta Cheat Sheet</h2>
        <p style={{ marginTop: "0.45rem", color: "var(--ink-soft)", lineHeight: 1.45 }}>
          After each run, delta is shown as `c`, `t`, `n`:
        </p>
        <div style={{ marginTop: "0.5rem", display: "grid", gap: "0.55rem" }}>
          <DeltaRow label="c = cohesion" meaning="Positive means stronger coordination; negative means fragmentation." />
          <DeltaRow label="t = trust" meaning="Positive means agents/public trust improves; negative means confidence drops." />
          <DeltaRow label="n = noise" meaning="Positive means rumor/conflict volume increases; negative means cleaner signal." />
        </div>
        <div style={{ marginTop: "0.65rem", border: "1px solid var(--line)", borderRadius: "0.65rem", padding: "0.7rem", background: "var(--bg-elev)" }}>
          <p className="code" style={{ fontSize: "0.8rem", color: "var(--ink-soft)" }}>
            Example
          </p>
          <p style={{ marginTop: "0.35rem", lineHeight: 1.5 }}>
            `c+2.0 t+1.2 n-0.8` means coordination and trust improved while noise decreased. That is usually a stabilizing cycle.
          </p>
        </div>
      </section>

      <section style={{ marginTop: "1.2rem", marginBottom: "0.4rem" }}>
        <h2 style={sectionTitleStyle}>Typical Workflow</h2>
        <div style={{ marginTop: "0.55rem", border: "1px solid var(--line)", borderRadius: "0.75rem", background: "var(--bg-elev)", padding: "0.8rem" }}>
          <ol style={{ marginLeft: "1rem", color: "var(--ink-soft)", lineHeight: 1.6, display: "grid", gap: "0.2rem" }}>
            <li>Define agents.</li>
            <li>Set world brief and scenario.</li>
            <li>Run cycles.</li>
            <li>Inspect Feed and Drift Review.</li>
            <li>Compare outcomes in History.</li>
            <li>Use Reset Simulation to start a fresh session while preserving older results in the database.</li>
          </ol>
        </div>
      </section>
    </main>
  );
}

function InfoCard({ title, body }: { title: string; body: string }) {
  return (
    <article style={{ border: "1px solid var(--line)", borderRadius: "0.75rem", background: "var(--bg-elev)", padding: "0.75rem" }}>
      <h3 style={{ fontSize: "0.95rem" }}>{title}</h3>
      <p style={{ marginTop: "0.42rem", color: "var(--ink-soft)", lineHeight: 1.45 }}>{body}</p>
    </article>
  );
}

function DeltaRow({ label, meaning }: { label: string; meaning: string }) {
  return (
    <div style={{ border: "1px solid var(--line)", borderRadius: "0.55rem", padding: "0.55rem 0.6rem", background: "var(--bg-elev)" }}>
      <p className="code" style={{ fontSize: "0.78rem", color: "var(--ink-soft)" }}>
        {label}
      </p>
      <p style={{ marginTop: "0.2rem", lineHeight: 1.42 }}>{meaning}</p>
    </div>
  );
}

const sectionTitleStyle: React.CSSProperties = {
  fontSize: "1.03rem",
  fontWeight: 700,
};
