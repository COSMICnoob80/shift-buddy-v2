import { notFound } from "next/navigation";
import { PROTOCOL_NAMES, type ProtocolData, type ProtocolName } from "@/lib/protocols";
import { readFileSync } from "fs";
import { join } from "path";

interface Params {
  params: Promise<{ name: string }>;
}

export function generateStaticParams() {
  return PROTOCOL_NAMES.map((name) => ({ name }));
}

function loadProtocolSync(name: ProtocolName): ProtocolData {
  const filePath = join(process.cwd(), "public", "protocols", `${name}.json`);
  const raw = readFileSync(filePath, "utf-8");
  return JSON.parse(raw) as ProtocolData;
}

export default async function ProtocolDetailPage({ params }: Params) {
  const { name } = await params;

  if (!(PROTOCOL_NAMES as readonly string[]).includes(name)) {
    notFound();
  }

  const protocol = loadProtocolSync(name as ProtocolName);

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "var(--color-bg)",
        padding: "var(--space-6)",
        fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      <div style={{ marginBottom: "var(--space-6)" }}>
        <h1
          style={{
            fontSize: "1.25rem",
            fontWeight: 600,
            color: "var(--color-text-primary)",
            marginBottom: "var(--space-2)",
          }}
        >
          {protocol.name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
        </h1>
        <p style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)" }}>
          {protocol.description}
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        {protocol.tiers.map((tier, idx) => (
          <div
            key={idx}
            style={{
              backgroundColor: "var(--color-surface)",
              borderRadius: "var(--radius-card)",
              padding: "var(--space-4)",
              borderLeft: "4px solid var(--color-accent)",
            }}
          >
            <div
              style={{
                fontWeight: 600,
                color: "var(--color-text-primary)",
                fontSize: "0.95rem",
                marginBottom: "var(--space-1)",
              }}
            >
              {tier.label}
            </div>
            <div
              style={{
                fontSize: "0.8rem",
                color: "var(--color-accent)",
                marginBottom: "var(--space-3)",
              }}
            >
              {tier.range}
            </div>
            <ul style={{ margin: 0, paddingLeft: "var(--space-4)" }}>
              {tier.actions.map((action, ai) => (
                <li
                  key={ai}
                  style={{
                    fontSize: "0.85rem",
                    color: "var(--color-text-primary)",
                    lineHeight: 1.6,
                    marginBottom: "var(--space-1)",
                  }}
                >
                  {action}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {protocol.escalation && (
        <div
          role="alert"
          style={{
            marginTop: "var(--space-6)",
            backgroundColor: "rgba(239,68,68,0.1)",
            borderLeft: "4px solid var(--color-critical)",
            borderRadius: "var(--radius-card)",
            padding: "var(--space-4)",
            fontSize: "0.875rem",
            color: "var(--color-critical)",
            fontWeight: 500,
          }}
        >
          ⚠ {protocol.escalation}
        </div>
      )}

      <div
        style={{
          marginTop: "var(--space-6)",
          fontSize: "0.75rem",
          color: "var(--color-text-secondary)",
          fontStyle: "italic",
        }}
      >
        Source: {protocol.source}
      </div>
    </div>
  );
}
