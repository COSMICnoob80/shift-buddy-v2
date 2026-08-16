"use client";

import { login } from "@/lib/api";
import { ApiError } from "@/lib/api";
import { setToken } from "@/lib/session";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await login({ email, password });
      setToken(res.token);
      router.push("/board");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.envelope.message);
      } else {
        setError("An unexpected error occurred.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.heading}>Sign in</h1>
        <form onSubmit={handleSubmit} style={styles.form}>
          <label style={styles.label}>
            Email
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={styles.input}
            />
          </label>
          <label style={styles.label}>
            Password
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={styles.input}
            />
          </label>
          {error && <p style={styles.error}>{error}</p>}
          <button type="submit" disabled={loading} style={styles.button}>
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <p style={styles.footer}>
          No account?{" "}
          <a href="/register" style={styles.link}>
            Register
          </a>
        </p>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "var(--color-bg)",
    padding: "var(--space-4)",
  },
  card: {
    backgroundColor: "var(--color-surface)",
    borderRadius: "var(--radius-card)",
    padding: "var(--space-8)",
    width: "100%",
    maxWidth: "400px",
  },
  heading: {
    fontWeight: 600,
    fontSize: "1.5rem",
    marginBottom: "var(--space-6)",
    color: "var(--color-text-primary)",
  },
  form: { display: "flex", flexDirection: "column" as const, gap: "var(--space-4)" },
  label: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "var(--space-1)",
    fontSize: "0.875rem",
    fontWeight: 500,
    color: "var(--color-text-secondary)",
  },
  input: {
    backgroundColor: "var(--color-bg)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: "var(--radius-input)",
    color: "var(--color-text-primary)",
    fontSize: "1rem",
    padding: "var(--space-2) var(--space-3)",
    outline: "none",
    fontFamily: "inherit",
  },
  error: { color: "var(--color-critical)", fontSize: "0.875rem" },
  button: {
    backgroundColor: "var(--color-accent)",
    border: "none",
    borderRadius: "var(--radius-button)",
    color: "#fff",
    cursor: "pointer",
    fontFamily: "inherit",
    fontSize: "1rem",
    fontWeight: 500,
    padding: "var(--space-3)",
    marginTop: "var(--space-2)",
  },
  footer: { marginTop: "var(--space-4)", fontSize: "0.875rem", color: "var(--color-text-secondary)", textAlign: "center" as const },
  link: { color: "var(--color-accent)", textDecoration: "none" },
} as const;
