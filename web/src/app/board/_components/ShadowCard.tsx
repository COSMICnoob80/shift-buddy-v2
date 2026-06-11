"use client";

import useSWR from "swr";
import { getShadowSuggest } from "@/lib/api";
import type { ShadowSuggestResponse } from "@/lib/api";

interface ShadowCardProps {
  patientId: string;
  enabled: boolean;
}

export default function ShadowCard({ patientId, enabled }: ShadowCardProps) {
  const { data } = useSWR<ShadowSuggestResponse>(
    enabled ? `shadow-suggest-${patientId}` : null,
    () => getShadowSuggest(patientId, "vitals"),
    { shouldRetryOnError: false },
  );

  if (!enabled || !data) return null;

  return (
    <div
      aria-label="Shadow mode agent suggestion"
      style={{
        borderLeft: "4px solid var(--color-accent)",
        backgroundColor: "rgba(99,102,241,0.08)",
        borderRadius: "var(--radius-card)",
        padding: "var(--space-4)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-2)",
        marginTop: "var(--space-4)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
        <span
          style={{
            fontSize: "0.65rem",
            fontWeight: 700,
            color: "var(--color-accent)",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            backgroundColor: "rgba(99,102,241,0.2)",
            borderRadius: "4px",
            padding: "2px 6px",
          }}
        >
          SHADOW
        </span>
        <span style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)", fontWeight: 500 }}>
          Agent suggests…
        </span>
        {data.severity && (
          <span style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", marginLeft: "auto" }}>
            {data.severity}
          </span>
        )}
      </div>

      <div style={{ fontSize: "0.875rem", color: "var(--color-text-primary)", lineHeight: 1.5 }}>
        {data.suggestion}
      </div>

      <div
        style={{
          fontSize: "0.75rem",
          color: "var(--color-text-secondary)",
          fontStyle: "italic",
          marginTop: "var(--space-1)",
        }}
      >
        {data.disclaimer}
      </div>
    </div>
  );
}
