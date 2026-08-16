import Link from "next/link";
import { PROTOCOL_DESCRIPTIONS, PROTOCOL_NAMES } from "@/lib/protocols";

export default function ProtocolsPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "var(--color-bg)",
        padding: "var(--space-6)",
        fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      <h1
        style={{
          fontSize: "1.25rem",
          fontWeight: 600,
          color: "var(--color-text-primary)",
          marginBottom: "var(--space-6)",
        }}
      >
        Clinical Protocols
      </h1>

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
        {PROTOCOL_NAMES.map((name) => (
          <Link
            key={name}
            href={`/protocols/${name}`}
            style={{
              display: "block",
              backgroundColor: "var(--color-surface)",
              borderRadius: "var(--radius-card)",
              padding: "var(--space-4)",
              textDecoration: "none",
              borderLeft: "4px solid var(--color-accent)",
            }}
          >
            <div style={{ fontWeight: 600, color: "var(--color-text-primary)", marginBottom: "4px" }}>
              {name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
            </div>
            <div style={{ fontSize: "0.85rem", color: "var(--color-text-secondary)" }}>
              {PROTOCOL_DESCRIPTIONS[name]}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
