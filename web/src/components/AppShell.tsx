"use client";

import { clearToken, getToken } from "@/lib/session";
import { useRouter } from "next/navigation";

interface AppShellProps {
  children: React.ReactNode;
  userLabel?: string;
}

export default function AppShell({ children, userLabel }: AppShellProps) {
  const router = useRouter();

  function handleLogout() {
    clearToken();
    router.push("/login");
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <header
        style={{
          backgroundColor: "var(--color-surface)",
          padding: "var(--space-4) var(--space-6)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <span
          style={{
            fontWeight: 600,
            fontSize: "1.125rem",
            color: "var(--color-text-primary)",
          }}
        >
          Shift Buddy
        </span>
        {userLabel && (
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
            <span
              style={{
                fontSize: "0.875rem",
                color: "var(--color-text-secondary)",
              }}
            >
              {userLabel}
            </span>
            <button
              onClick={handleLogout}
              style={{
                background: "none",
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: "var(--radius-button)",
                color: "var(--color-text-secondary)",
                cursor: "pointer",
                fontSize: "0.875rem",
                padding: "var(--space-1) var(--space-3)",
              }}
            >
              Sign out
            </button>
          </div>
        )}
      </header>

      <main style={{ flex: 1, padding: "var(--space-6)" }}>{children}</main>

      <nav
        style={{
          backgroundColor: "var(--color-surface)",
          borderTop: "1px solid rgba(255,255,255,0.08)",
          display: "flex",
          justifyContent: "space-around",
          padding: "var(--space-3) 0",
        }}
      >
        <NavTab label="Board" active />
      </nav>
    </div>
  );
}

function NavTab({ label, active }: { label: string; active?: boolean }) {
  return (
    <button
      style={{
        background: "none",
        border: "none",
        cursor: "pointer",
        color: active ? "var(--color-accent)" : "var(--color-text-secondary)",
        fontFamily: "inherit",
        fontWeight: active ? 600 : 400,
        fontSize: "0.875rem",
        padding: "var(--space-2) var(--space-4)",
      }}
    >
      {label}
    </button>
  );
}
