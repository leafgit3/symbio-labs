import { ReactNode } from "react";

type Column<T> = {
  key: keyof T;
  label: string;
  render?: (row: T) => ReactNode;
  noWrap?: boolean;
};

type DataTableProps<T extends Record<string, unknown>> = {
  columns: Column<T>[];
  rows: T[];
  emptyLabel: string;
};

export function DataTable<T extends Record<string, unknown>>({
  columns,
  rows,
  emptyLabel,
}: DataTableProps<T>) {
  const tableMinWidth = Math.max(420, columns.length * 120);

  if (!rows.length) {
    return <p style={{ color: "var(--ink-soft)" }}>{emptyLabel}</p>;
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: `${tableMinWidth}px` }}>
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={String(column.key)}
                style={{
                  textAlign: "left",
                  padding: "0.5rem",
                  borderBottom: "1px solid var(--line)",
                  fontSize: "0.82rem",
                  whiteSpace: column.noWrap ? "nowrap" : "normal",
                }}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index}>
              {columns.map((column) => (
                <td
                  key={`${index}-${String(column.key)}`}
                  style={{
                    padding: "0.5rem",
                    borderBottom: "1px solid var(--line)",
                    fontSize: "0.88rem",
                    verticalAlign: "top",
                    whiteSpace: column.noWrap ? "nowrap" : "normal",
                    overflowWrap: column.noWrap ? "normal" : "break-word",
                  }}
                >
                  {column.render ? column.render(row) : String(row[column.key] ?? "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
