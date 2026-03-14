import { ReactNode } from "react";

type PanelProps = {
  title: string;
  children: ReactNode;
  rightSlot?: ReactNode;
  className?: string;
};

export function Panel({ title, children, rightSlot, className }: PanelProps) {
  return (
    <section
      className={className}
      style={{
        background: "var(--bg-elev)",
        border: "1px solid var(--line)",
        borderRadius: "0.75rem",
        padding: "1rem",
        minWidth: 0,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "0.8rem",
          marginBottom: "0.9rem",
        }}
      >
        <h2 style={{ fontSize: "1rem" }}>{title}</h2>
        {rightSlot}
      </div>
      {children}
    </section>
  );
}
