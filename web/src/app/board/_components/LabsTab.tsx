import type { LabResult } from "@/lib/api";

interface LabsTabProps {
  labs: LabResult[];
  isLoading?: boolean;
}

export default function LabsTab({ labs, isLoading }: LabsTabProps) {
  if (isLoading) {
    return <div style={styles.empty}>Loading…</div>;
  }

  const sorted = [...labs].sort(
    (a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime(),
  );

  if (sorted.length === 0) {
    return <div style={styles.empty}>No lab results recorded.</div>;
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Test</th>
            <th style={styles.th}>Value</th>
            <th style={styles.th}>Unit</th>
            <th style={styles.th}>Ref Range</th>
            <th style={styles.th}>Time</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((lab) => (
            <tr key={lab.id}>
              <td style={styles.td}>{lab.test_name}</td>
              <td
                style={{
                  ...styles.td,
                  color: lab.is_critical ? "var(--color-critical)" : "var(--color-text-primary)",
                  fontWeight: lab.is_critical ? 600 : 400,
                }}
              >
                {lab.value}
              </td>
              <td style={styles.td}>{lab.unit}</td>
              <td style={{ ...styles.td, color: "var(--color-text-secondary)" }}>
                {lab.reference_low != null && lab.reference_high != null
                  ? `${lab.reference_low}–${lab.reference_high}`
                  : "—"}
              </td>
              <td style={{ ...styles.td, color: "var(--color-text-secondary)" }}>
                {new Date(lab.recorded_at).toLocaleDateString("en-PK", {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const styles = {
  table: {
    width: "100%",
    borderCollapse: "collapse" as const,
    fontSize: "0.82rem",
  },
  th: {
    textAlign: "left" as const,
    padding: "var(--space-2) var(--space-3)",
    color: "var(--color-text-secondary)",
    fontWeight: 500,
    borderBottom: "1px solid rgba(255,255,255,0.08)",
    whiteSpace: "nowrap" as const,
  },
  td: {
    padding: "var(--space-2) var(--space-3)",
    color: "var(--color-text-primary)",
    borderBottom: "1px solid rgba(255,255,255,0.04)",
    whiteSpace: "nowrap" as const,
  },
  empty: {
    color: "var(--color-text-secondary)",
    fontSize: "0.875rem",
    padding: "var(--space-6)",
    textAlign: "center" as const,
  },
} as const;
