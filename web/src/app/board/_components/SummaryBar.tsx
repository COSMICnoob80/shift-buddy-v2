import type { PatientSummary } from "@/lib/api";

interface SummaryBarProps {
  summary: PatientSummary;
}

const badges = [
  { key: "total" as const, label: "Total", color: "var(--color-text-secondary)", bg: "rgba(255,255,255,0.06)" },
  { key: "critical" as const, label: "Critical", color: "var(--color-critical)", bg: "rgba(239,68,68,0.12)" },
  { key: "urgent" as const, label: "Urgent", color: "var(--color-warning)", bg: "rgba(245,158,11,0.12)" },
  { key: "stable" as const, label: "Stable", color: "var(--color-stable)", bg: "rgba(34,197,94,0.12)" },
  { key: "discharge_ready" as const, label: "Discharge", color: "var(--color-discharge)", bg: "rgba(59,130,246,0.12)" },
] as const;

export default function SummaryBar({ summary }: SummaryBarProps) {
  return (
    <div
      role="status"
      aria-label="Patient acuity summary"
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "var(--space-2)",
        marginBottom: "var(--space-4)",
      }}
    >
      {badges.map(({ key, label, color, bg }) => (
        <div
          key={key}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-1)",
            backgroundColor: bg,
            borderRadius: "var(--radius-button)",
            padding: "var(--space-1) var(--space-3)",
            fontSize: "0.8rem",
            fontWeight: 500,
          }}
        >
          <span style={{ color, fontWeight: 700, fontSize: "0.95rem" }}>
            {summary[key]}
          </span>
          <span style={{ color: "var(--color-text-secondary)" }}>{label}</span>
        </div>
      ))}
    </div>
  );
}
