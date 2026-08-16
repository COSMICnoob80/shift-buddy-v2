"use client";

import type { Alert } from "@/lib/api";

interface WarningAlertBannerProps {
  alert: Alert;
  onDismiss: () => void;
}

export default function WarningAlertBanner({ alert, onDismiss }: WarningAlertBannerProps) {
  return (
    <div
      role="alert"
      aria-live="polite"
      style={{
        backgroundColor: "rgba(245,158,11,0.15)",
        borderLeft: "3px solid var(--color-warning)",
        color: "var(--color-warning)",
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
        onClick={onDismiss}
        aria-label="Dismiss warning"
        style={{
          background: "none",
          border: "none",
          color: "var(--color-warning)",
          cursor: "pointer",
          fontSize: "1.1rem",
          lineHeight: 1,
          padding: "0 var(--space-1)",
          flexShrink: 0,
        }}
      >
        ×
      </button>
    </div>
  );
}
