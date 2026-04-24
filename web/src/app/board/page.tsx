"use client";

import AppShell from "@/components/AppShell";
import { getToken } from "@/lib/session";
import { redirect } from "next/navigation";
import { useEffect, useState } from "react";

export default function BoardPage() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      redirect("/login");
    }
    setReady(true);
  }, []);

  if (!ready) return null;

  return (
    <AppShell userLabel="House Officer">
      <div style={styles.placeholder}>
        <h2 style={styles.title}>Clinical Board</h2>
        <p style={styles.body}>
          Patient data and clinical features arrive in Phase 1.
          <br />
          Your session is active.
        </p>
      </div>
    </AppShell>
  );
}

const styles = {
  placeholder: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    justifyContent: "center",
    minHeight: "60vh",
    gap: "var(--space-4)",
    textAlign: "center" as const,
  },
  title: {
    fontWeight: 600,
    fontSize: "1.25rem",
    color: "var(--color-text-primary)",
  },
  body: {
    color: "var(--color-text-secondary)",
    fontSize: "0.95rem",
    lineHeight: 1.6,
  },
} as const;
