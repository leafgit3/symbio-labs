import Link from "next/link";

export default function HomePage() {
  return (
    <main>
      <h1>Symbio Labs Scaffold</h1>
      <p style={{ color: "var(--ink-soft)", marginTop: "0.6rem" }}>
        Start on Dashboard to run cycles, then use Agents, Feed, Drift Review, and History to inspect results.
      </p>
      <div style={{ display: "flex", gap: "0.8rem", marginTop: "1.2rem", flexWrap: "wrap" }}>
        <Link href="/dashboard">Open Dashboard</Link>
        <Link href="/agents">Agents</Link>
        <Link href="/feed">Feed</Link>
        <Link href="/memories">Memories</Link>
        <Link href="/history">History</Link>
        <Link href="/admin">Admin</Link>
      </div>
    </main>
  );
}
