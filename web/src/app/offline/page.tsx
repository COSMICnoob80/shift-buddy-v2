export default function OfflinePage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "var(--color-bg)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "var(--space-6)",
        padding: "var(--space-6)",
        fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      {/* WiFi-off icon */}
      <svg
        width="64"
        height="64"
        viewBox="0 0 24 24"
        fill="none"
        stroke="var(--color-text-secondary)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <line x1="2" y1="2" x2="22" y2="22" />
        <path d="M8.5 16.5a5 5 0 0 1 7 0" />
        <path d="M2 8.82a15 15 0 0 1 4.17-2.65" />
        <path d="M10.66 5c4.01-.36 8.14.9 11.34 3.76" />
        <path d="M16.85 11.25a10 10 0 0 1 2.22 1.68" />
        <path d="M5 12.7a10 10 0 0 1 5.24-2.65" />
        <line x1="12" y1="20" x2="12.01" y2="20" strokeWidth="2" />
      </svg>

      <div style={{ textAlign: "center", maxWidth: "320px" }}>
        <h1
          style={{
            fontSize: "1.25rem",
            fontWeight: 600,
            color: "var(--color-text-primary)",
            marginBottom: "var(--space-2)",
          }}
        >
          You are offline
        </h1>
        <p
          style={{
            color: "var(--color-text-secondary)",
            fontSize: "0.95rem",
            lineHeight: 1.6,
          }}
        >
          Patient data may be stale. Cached data is available on the board. Connect to the
          network to receive the latest updates.
        </p>
      </div>
    </div>
  );
}
