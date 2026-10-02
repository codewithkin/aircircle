"use client";

// Next generates and prerenders a /_global-error route whether or not you
// define one. Providing it explicitly means the build prerenders this
// component instead of a synthesized default — and gives visitors something
// on-brand rather than an unstyled stack trace if the root layout ever throws.
//
// Must render its own <html>/<body>: global-error replaces the root layout
// entirely, so nothing from layout.tsx (including fonts) is available here.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1.5rem",
          padding: "2rem",
          backgroundColor: "#f5f6f8",
          color: "#101114",
          fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
          textAlign: "center",
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: "0.75rem",
            letterSpacing: "0.3em",
            textTransform: "uppercase",
            color: "#006eb3",
          }}
        >
          Aircircle
        </p>

        <h1 style={{ margin: 0, fontSize: "1.75rem", fontWeight: 500 }}>
          Something broke on our end.
        </h1>

        <p style={{ margin: 0, maxWidth: "26rem", lineHeight: 1.7, color: "#6b7080" }}>
          Not your fault. Try again, or head back to the homepage.
        </p>

        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", justifyContent: "center" }}>
          <button
            onClick={reset}
            style={{
              cursor: "pointer",
              borderRadius: "999px",
              border: "none",
              backgroundColor: "#006eb3",
              color: "#ffffff",
              padding: "0.75rem 1.5rem",
              fontSize: "0.9rem",
              fontWeight: 500,
            }}
          >
            Try again
          </button>
          <a
            href="/"
            style={{
              borderRadius: "999px",
              border: "1px solid #e3e5ea",
              color: "#101114",
              padding: "0.75rem 1.5rem",
              fontSize: "0.9rem",
              textDecoration: "none",
            }}
          >
            Go home
          </a>
        </div>

        {error.digest ? (
          <p style={{ margin: 0, fontSize: "0.75rem", color: "#8b90a0" }}>
            Reference: {error.digest}
          </p>
        ) : null}
      </body>
    </html>
  );
}
