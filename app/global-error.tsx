"use client";

// Catches errors thrown in the root layout itself (providers, fonts). It must
// render its own <html>/<body> because it replaces the root layout.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  void error;
  return (
    <html lang="en">
      <body
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#FBFAF6",
          color: "#171713",
          fontFamily: "system-ui, sans-serif",
          textAlign: "center",
          padding: "1.5rem",
        }}
      >
        <div>
          <h1 style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>
            Something went wrong.
          </h1>
          <p style={{ color: "#706D65", marginBottom: "1.25rem" }}>
            Please reload the page.
          </p>
          <button
            onClick={reset}
            style={{
              height: "44px",
              padding: "0 20px",
              borderRadius: "9px",
              border: "none",
              background: "#087A55",
              color: "#fff",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
