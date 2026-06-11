"use client";

import { useEffect, useState } from "react";
import { clearToken, getToken } from "@/lib/session";
import { useRouter } from "next/navigation";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface AppShellProps {
  children: React.ReactNode;
  userLabel?: string;
}

export default function AppShell({ children, userLabel }: AppShellProps) {
  const router = useRouter();
  const [isOnline, setIsOnline] = useState(true);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installDone, setInstallDone] = useState(false);

  useEffect(() => {
    setIsOnline(navigator.onLine);

    function onOnline() { setIsOnline(true); }
    function onOffline() { setIsOnline(false); }
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    function onBeforeInstall(e: Event) {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    }
    window.addEventListener("beforeinstallprompt", onBeforeInstall);

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
    };
  }, []);

  async function handleInstall() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const result = await installPrompt.userChoice;
    console.info("PWA install choice:", result.outcome);
    setInstallDone(true);
    setInstallPrompt(null);
  }

  function handleLogout() {
    clearToken();
    router.push("/login");
  }

  const showInstallBtn = installPrompt !== null && !installDone;

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Offline banner — Principle XII */}
      {!isOnline && (
        <div
          role="status"
          aria-live="polite"
          style={{
            backgroundColor: "rgba(245,158,11,0.15)",
            borderBottom: "1px solid var(--color-warning)",
            color: "var(--color-warning)",
            textAlign: "center",
            padding: "var(--space-2) var(--space-4)",
            fontSize: "0.8rem",
            fontWeight: 500,
          }}
        >
          Offline — showing cached data
        </div>
      )}

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
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
          {showInstallBtn && (
            <button
              onClick={handleInstall}
              aria-label="Install Shift Buddy app"
              style={{
                background: "none",
                border: "1px solid var(--color-accent)",
                borderRadius: "var(--radius-button)",
                color: "var(--color-accent)",
                cursor: "pointer",
                fontSize: "0.8rem",
                fontWeight: 500,
                padding: "var(--space-1) var(--space-3)",
              }}
            >
              Install App
            </button>
          )}
          {userLabel && (
            <>
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
            </>
          )}
        </div>
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
        <NavTab label="Board" href="/board" />
        <NavTab label="Protocols" href="/protocols" />
      </nav>
    </div>
  );
}

function NavTab({ label, href }: { label: string; href: string }) {
  return (
    <a
      href={href}
      style={{
        textDecoration: "none",
        color: "var(--color-text-secondary)",
        fontFamily: "inherit",
        fontWeight: 400,
        fontSize: "0.875rem",
        padding: "var(--space-2) var(--space-4)",
      }}
    >
      {label}
    </a>
  );
}
