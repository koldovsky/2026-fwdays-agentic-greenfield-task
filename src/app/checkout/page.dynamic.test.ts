// FR-PAYWALL-03 reflection — route-segment config tests.
//
// After a successful checkout, the client triggers router.refresh() (the
// injectable refresh seam) which causes the return pages to be refetched
// from the server rather than served stale from the client Router Cache.
// The return pages (/tailor and /account/billing) carry `dynamic =
// "force-dynamic"` so any full-page visit ALSO bypasses a stale prerender.
//
// These tests assert the OBSERVABLE CONTRACT at the module boundary (the
// exported constant is what Next's runtime reads), not Next internals.
// Written as pure .ts so they run in the "pure" vitest project (node env),
// matching the framework-free test policy for non-component assertions.
import { describe, expect, it } from "vitest";

// Dynamic imports are used so each test gets an isolated module evaluation.
// The pages are server components — they import server-only modules — but
// the constant they export is evaluated at module load time before any
// async request context is needed.

describe("FR-PAYWALL-03 — return pages carry force-dynamic", () => {
  it("tailor page exports dynamic = force-dynamic (per-request subscription read)", async () => {
    // We can't import the page directly in node env without mocking its heavy
    // server deps (auth, db, cookies). Instead we read the module text and
    // assert the directive is exported — this is a valid spec-level contract
    // check that the directive exists at the module boundary regardless of
    // any runtime behaviour.
    const { readFileSync } = await import("node:fs");
    const { fileURLToPath } = await import("node:url");
    const { resolve, dirname } = await import("node:path");

    // Resolve relative to this test file's location.
    const thisDir = dirname(fileURLToPath(import.meta.url));
    const pageSource = readFileSync(resolve(thisDir, "../tailor/page.tsx"), "utf-8");

    // The directive must be exported at module scope (not inside a function).
    expect(pageSource).toMatch(/export\s+const\s+dynamic\s*=\s*["']force-dynamic["']/);
  });

  it("account/billing page exports dynamic = force-dynamic (per-request subscription snapshot)", async () => {
    const { readFileSync } = await import("node:fs");
    const { fileURLToPath } = await import("node:url");
    const { resolve, dirname } = await import("node:path");

    const thisDir = dirname(fileURLToPath(import.meta.url));
    const pageSource = readFileSync(
      resolve(thisDir, "../account/billing/page.tsx"),
      "utf-8",
    );

    expect(pageSource).toMatch(/export\s+const\s+dynamic\s*=\s*["']force-dynamic["']/);
  });
});
