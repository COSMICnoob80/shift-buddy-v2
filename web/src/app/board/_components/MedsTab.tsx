import type { Medication } from "@/lib/api";

interface MedsTabProps {
  medications: Medication[];
}

export default function MedsTab({ medications }: MedsTabProps) {
  if (medications.length === 0) {
    return <div style={styles.empty}>No current medications.</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
      {medications.map((med, idx) => (
        <div key={idx} style={styles.row}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <span style={{ fontWeight: 600, color: "var(--color-text-primary)", fontSize: "0.875rem" }}>
              {med.name}
            </span>
            <span
              style={{
                fontSize: "0.75rem",
                color: "var(--color-accent)",
                fontWeight: 500,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              {med.route}
            </span>
          </div>
          <div style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>
            {med.dose} · {med.frequency}
          </div>
          {med.notes && (
            <div style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", fontStyle: "italic" }}>
              {med.notes}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

const styles = {
  row: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: "var(--radius-card)",
    padding: "var(--space-3)",
    display: "flex",
    flexDirection: "column" as const,
    gap: "var(--space-1)",
  },
  empty: {
    color: "var(--color-text-secondary)",
    fontSize: "0.875rem",
    padding: "var(--space-6)",
    textAlign: "center" as const,
  },
} as const;
