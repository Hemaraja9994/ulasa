"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * `/protocols` was the route the nav called "Elicitation". The screen now
 * lives at `/elicitation`; this keeps existing bookmarks and any link out in
 * the world working rather than 404ing them.
 *
 * A client-side redirect rather than a config rewrite because the app is a
 * static export — there is no server to answer with a 308.
 */
export default function ProtocolsRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/elicitation");
  }, [router]);

  return (
    <p className="py-10 text-center text-sm" style={{ color: "var(--text-muted)" }}>
      Elicitation has moved to <span className="mono">/elicitation</span>. Taking you there…
    </p>
  );
}
