import type { VitalSigns } from "@/lib/api";

interface VitalsTabProps {
  vitals: VitalSigns[];
  isLoading?: boolean;
}

function fmt(val: number | null | undefined, unit?: string): string {
  if (val == null) return "—";
  return unit ? `${val} ${unit}` : String(val);
}

export default function VitalsTab({ vitals, isLoading }: VitalsTabProps) {
  if (isLoading) {
    return <div style={styles.empty}>Loading…</div>;
  }

  const sorted = [...vitals].sort(
    (a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime(),
  );
  const recent = sorted.slice(0, 5);

  if (recent.length === 0) {
    return <div style={styles.empty}>No vitals recorded.</div>;
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Time</th>
            <th style={styles.th}>HR</th>
            <th style={styles.th}>BP</th>
            <th style={styles.th}>Temp</th>
            <th style={styles.th}>SpO₂</th>
            <th style={styles.th}>RR</th>
            <th style={styles.th}>GCS</th>
          </tr>
        </thead>
        <tbody>
          {recent.map((v) => (
            <tr key={v.id}>
              <td style={styles.td}>
                {new Date(v.recorded_at).toLocaleTimeString("en-PK", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </td>
              <td style={styles.td}>{fmt(v.heart_rate, "bpm")}</td>
              <td style={styles.td}>
                {v.systolic_bp != null && v.diastolic_bp != null
                  ? `${v.systolic_bp}/${v.diastolic_bp}`
                  : "—"}
              </td>
              <td style={styles.td}>{fmt(v.temperature, "°C")}</td>
              <td style={styles.td}>{fmt(v.spo2, "%")}</td>
              <td style={styles.td}>{fmt(v.respiratory_rate, "/min")}</td>
              <td style={styles.td}>{fmt(v.gcs)}</td>
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
