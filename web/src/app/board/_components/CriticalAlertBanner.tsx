"use client";

import { useState } from "react";
import { acknowledgeAlert } from "@/lib/api";
import type { Alert } from "@/lib/api";

interface CriticalAlertBannerProps {
  alert: Alert;
  onAcknowledged: () => void;
}

export default function CriticalAlertBanner({ alert, onAcknowledged }: CriticalAlertBannerProps) {
  const [loading, setLoading] = useState(false);

  async function handleAcknowledge() {
    setLoading(true);
    try {
      await acknowledgeAlert(alert.id);
      onAcknowledged();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      role="alert"
      aria-live="assertive"
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        backgroundColor: "var(--color-critical)",
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "var(--space-3) var(--space-4)",
        gap: "var(--space-4)",
        fontSize: "0.875rem",
        fontWeight: 500,
      }}
    >
      <span style={{ flex: 1 }}>⚠ {alert.message}</span>
      <button
        onClick={handleAcknowledge}
        disabled={loading}
        aria-label="Acknowledge critical alert"
        style={{
          flexShrink: 0,
          backgroundColor: "rgba(0,0,0,0.2)",
          color: "#fff",
          border: "1px solid rgba(255,255,255,0.4)",
          borderRadius: "var(--radius-button)",
          padding: "var(--space-1) var(--space-3)",
          cursor: loading ? "not-allowed" : "pointer",
          fontSize: "0.8rem",
          fontWeight: 600,
          opacity: loading ? 0.7 : 1,
        }}
      >
        {loading ? "…" : "Acknowledge"}
      </button>
    </div>
  );
}
