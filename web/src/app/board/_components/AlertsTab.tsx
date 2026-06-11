"use client";

import { useState } from "react";
import type { Alert } from "@/lib/api";
import CriticalAlertBanner from "./CriticalAlertBanner";
import WarningAlertBanner from "./WarningAlertBanner";

interface AlertsTabProps {
  alerts: Alert[];
  isLoading?: boolean;
  onRefresh: () => void;
}

export default function AlertsTab({ alerts, isLoading, onRefresh }: AlertsTabProps) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  if (isLoading) {
    return <div style={styles.empty}>Loading…</div>;
  }

  const unacked = alerts.filter((a) => !a.acknowledged && !dismissed.has(a.id));
  const critical = unacked.filter((a) => a.alert_type === "critical");
  const warnings = unacked.filter((a) => a.alert_type === "warning");

  if (unacked.length === 0) {
    return <div style={styles.empty}>No active alerts.</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
      {critical.map((a) => (
        <CriticalAlertBanner key={a.id} alert={a} onAcknowledged={onRefresh} />
      ))}
      {warnings.map((a) => (
        <WarningAlertBanner
          key={a.id}
          alert={a}
          onDismiss={() => setDismissed((prev) => new Set([...prev, a.id]))}
        />
      ))}
    </div>
  );
}

const styles = {
  empty: {
    color: "var(--color-text-secondary)",
    fontSize: "0.875rem",
    padding: "var(--space-6)",
    textAlign: "center" as const,
  },
} as const;
