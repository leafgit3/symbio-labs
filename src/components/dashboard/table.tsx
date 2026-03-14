import { ReactNode } from "react";

type Column<T> = {
  key: keyof T;
  label: string;
  render?: (row: T) => ReactNode;
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
  if (!rows.length) {
    return <p style={{ color: "var(--ink-soft)" }}>{emptyLabel}</p>;
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "420px" }}>
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
                    whiteSpace: "normal",
                    overflowWrap: "anywhere",
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
