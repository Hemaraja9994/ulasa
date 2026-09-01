"use client";

import { useHydrated } from "@/store/useStore";

/**
 * Renders children only once the persisted store has been read back.
 *
 * ULASA's pages are prerendered as static HTML, so the first React render on a
 * cold load runs against the empty defaults. Anything that reads saved samples
 * must wait, or a clinician who simply refreshes the page is told they have no
 * samples while their work sits intact in localStorage — the most alarming
 * possible bug in a tool whose promise is "your data stays on your device".
 */
export function Hydrated({
  children,
  fallback,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const hydrated = useHydrated();
  if (!hydrated) {
    return (
      fallback ?? (
        <div
          className="card p-6 text-center"
          style={{ color: "var(--text-muted)" }}
          aria-busy="true"
        >
          Loading your samples…
        </div>
      )
    );
  }
  return <>{children}</>;
}
