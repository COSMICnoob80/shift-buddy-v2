import type { Alert, Patient } from "@/lib/api";

const ACUITY_COLORS: Record<string, string> = {
  critical: "#ef4444",
  urgent: "#f59e0b",
  stable: "#22c55e",
  discharge_ready: "#3b82f6",
};

interface PatientCardProps {
  patient: Patient;
  lastAlert?: Alert;
  onClick: () => void;
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max) + "…" : s;
}

export default function PatientCard({ patient, lastAlert, onClick }: PatientCardProps) {
  const borderColor = ACUITY_COLORS[patient.acuity] ?? "var(--color-text-secondary)";

  return (
    <button
      onClick={onClick}
      aria-label={`Patient ${patient.bed_number} — ${patient.acuity}`}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-2)",
        backgroundColor: "var(--color-surface)",
        borderRadius: "var(--radius-card)",
        borderLeft: `4px solid ${borderColor}`,
        padding: "var(--space-4)",
        cursor: "pointer",
        textAlign: "left",
        width: "100%",
        border: "none",
        outline: "none",
        borderLeftWidth: "4px",
        borderLeftStyle: "solid",
        borderLeftColor: borderColor,
        boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
        transition: "opacity 0.15s",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
      onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <span
          style={{
            fontSize: "0.75rem",
            fontWeight: 600,
            color: "var(--color-text-secondary)",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          Bed {patient.bed_number}
        </span>
        <span
          style={{
            fontSize: "0.7rem",
            fontWeight: 600,
            color: borderColor,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          {patient.acuity.replace("_", " ")}
        </span>
      </div>

      <div style={{ fontWeight: 600, color: "var(--color-text-primary)", fontSize: "0.95rem" }}>
        {truncate(patient.name, 20)}
      </div>

      <div style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)", lineHeight: 1.4 }}>
        {truncate(patient.provisional_diagnosis, 60)}
      </div>

      {lastAlert && (
        <div
          style={{
            fontSize: "0.75rem",
            color: lastAlert.alert_type === "critical" ? "var(--color-critical)" : "var(--color-warning)",
            marginTop: "var(--space-1)",
            borderTop: "1px solid rgba(255,255,255,0.06)",
            paddingTop: "var(--space-2)",
          }}
        >
          ⚠ {truncate(lastAlert.message, 50)}
        </div>
      )}
    </button>
  );
}
