// Tests for best-effort per-bullet source-role attribution (T5 #7,
// improve-tailoring-quality §4.3 follow-up). Written by the TEST-AUTHOR
// subagent (maker≠test-author, separation of duties) against the SPEC, not
// the implementation:
//   - A cv-source bullet is placed under the FIRST role whose original bullet
//     line tolerantly matches (case/whitespace-insensitive, contains either
//     direction) its grounding evidence sentence.
//   - A bullet with no cv-source evidence (user-confirmed, or no `source` at
//     all), or a cv-source bullet whose evidence matches no role, falls back
//     to role index 0 (most-recent role) — the pre-existing honest default.
//   - Generation order is preserved within a role.
//   - HONESTY INVARIANT (BC-HONESTY-02): the multiset of bullet texts across
//     all experience roles is exactly the kept-bullet texts — attribution only
//     ever relocates a kept bullet, never adds, drops, or duplicates one.
//   - Roles empty → flat fallback (no sections.experience).
import { describe, expect, it } from "vitest";

import type { Bullet } from "@/entities/bullet";
import type { CvDocument } from "@/entities/cv-profile";

import { buildExportDocument } from "./build-document";

// ---------------------------------------------------------------------------
// Shared CV fixture: two roles, each with a distinctive original bullet line
// that can serve as grounding evidence for attribution.
// ---------------------------------------------------------------------------

const twoRoleDoc: CvDocument = {
  experience: [
    {
      title: "Senior Engineer, Acme Corp",
      dateRange: { startMonth: 2020 * 12, ongoing: true, raw: "2020 – present" },
      bullets: ["Led the checkout redesign project", "Owned the on-call rotation"],
    },
    {
      title: "Backend Developer, StartupXYZ",
      dateRange: { startMonth: 2017 * 12, endMonth: 2020 * 12, ongoing: false, raw: "2017-2020" },
      bullets: ["Migrated the billing service to Postgres", "Wrote the initial API gateway"],
    },
  ],
  skills: ["typescript", "postgresql"],
};

// ---------------------------------------------------------------------------
// (a) cv-source bullet whose evidence matches role[1] lands under role[1]
// ---------------------------------------------------------------------------

describe("attributeRoleIndex: cv-source bullet attaches to its matching role", () => {
  it("a cv-source bullet whose evidence matches role[1]'s original line lands under role[1], not role[0]", () => {
    const bullet: Bullet = {
      id: "attr-1",
      text: "Migrated the billing service from MySQL to Postgres.",
      grounding: "grounded",
      source: { kind: "cv", sentence: "Migrated the billing service to Postgres" },
      includedInExport: true,
    };
    const doc = buildExportDocument([bullet], { cvDocument: twoRoleDoc });
    const roles = doc.sections!.experience!;
    expect(roles[0].bullets).not.toContain(bullet.text);
    expect(roles[1].bullets).toContain(bullet.text);
  });

  it("a cv-source bullet whose evidence matches role[0]'s original line lands under role[0]", () => {
    const bullet: Bullet = {
      id: "attr-2",
      text: "Led a full checkout redesign end-to-end.",
      grounding: "grounded",
      source: { kind: "cv", sentence: "Led the checkout redesign project" },
      includedInExport: true,
    };
    const doc = buildExportDocument([bullet], { cvDocument: twoRoleDoc });
    const roles = doc.sections!.experience!;
    expect(roles[0].bullets).toContain(bullet.text);
    expect(roles[1].bullets).not.toContain(bullet.text);
  });
});

// ---------------------------------------------------------------------------
// (b) fallback to role[0]: user-confirmed, opted-back-in overclaim, no match
// ---------------------------------------------------------------------------

describe("attributeRoleIndex: unattributable bullets fall back to role[0]", () => {
  it("a user-confirmed bullet (no cv-sentence evidence) falls back to role[0]", () => {
    const bullet: Bullet = {
      id: "attr-3",
      text: "Mentored two junior engineers on the team.",
      grounding: "grounded",
      source: {
        kind: "user-confirmed",
        question: "Did you mentor anyone?",
        answer: "Yes, two juniors.",
      },
      includedInExport: true,
    };
    const doc = buildExportDocument([bullet], { cvDocument: twoRoleDoc });
    const roles = doc.sections!.experience!;
    expect(roles[0].bullets).toContain(bullet.text);
    expect(roles[1].bullets).not.toContain(bullet.text);
  });

  it("an overclaim-risk bullet the user opted back into export (no source) falls back to role[0]", () => {
    const bullet: Bullet = {
      id: "attr-4",
      text: "Scaled the platform to 10M users.",
      grounding: "overclaim-risk",
      includedInExport: true,
    };
    const doc = buildExportDocument([bullet], { cvDocument: twoRoleDoc });
    const roles = doc.sections!.experience!;
    expect(roles[0].bullets).toContain(bullet.text);
    expect(roles[1].bullets).not.toContain(bullet.text);
  });

  it("a cv-source bullet whose evidence matches no role's original line falls back to role[0]", () => {
    const bullet: Bullet = {
      id: "attr-5",
      text: "Automated the release pipeline.",
      grounding: "grounded",
      source: { kind: "cv", sentence: "Set up CI/CD automation for weekly releases" },
      includedInExport: true,
    };
    const doc = buildExportDocument([bullet], { cvDocument: twoRoleDoc });
    const roles = doc.sections!.experience!;
    expect(roles[0].bullets).toContain(bullet.text);
    expect(roles[1].bullets).not.toContain(bullet.text);
  });

  it("all three fallback cases land in role[0] together, none in role[1]", () => {
    const userConfirmed: Bullet = {
      id: "attr-6a",
      text: "Mentored two junior engineers.",
      grounding: "grounded",
      source: { kind: "user-confirmed", question: "Mentor anyone?", answer: "Yes." },
      includedInExport: true,
    };
    const optedBackIn: Bullet = {
      id: "attr-6b",
      text: "Scaled the platform to 10M users.",
      grounding: "overclaim-risk",
      includedInExport: true,
    };
    const noMatch: Bullet = {
      id: "attr-6c",
      text: "Automated the release pipeline.",
      grounding: "grounded",
      source: { kind: "cv", sentence: "No corresponding line anywhere on the CV" },
      includedInExport: true,
    };
    const doc = buildExportDocument([userConfirmed, optedBackIn, noMatch], {
      cvDocument: twoRoleDoc,
    });
    const roles = doc.sections!.experience!;
    expect(roles[0].bullets).toEqual([userConfirmed.text, optedBackIn.text, noMatch.text]);
    expect(roles[1].bullets).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// (c) generation order preserved within a role
// ---------------------------------------------------------------------------

describe("attributeRoleIndex: generation order is preserved within a role", () => {
  it("two bullets attributed to the same role keep their generation (input) order", () => {
    const first: Bullet = {
      id: "order-1",
      text: "Migrated the billing service to a managed Postgres instance.",
      grounding: "grounded",
      source: { kind: "cv", sentence: "Migrated the billing service to Postgres" },
      includedInExport: true,
    };
    const second: Bullet = {
      id: "order-2",
      text: "Wrote a new versioned API gateway from scratch.",
      grounding: "grounded",
      source: { kind: "cv", sentence: "Wrote the initial API gateway" },
      includedInExport: true,
    };
    // Feed them in reverse generation order to prove the order kept is INPUT order.
    const doc = buildExportDocument([second, first], { cvDocument: twoRoleDoc });
    const roles = doc.sections!.experience!;
    expect(roles[1].bullets).toEqual([second.text, first.text]);
  });

  it("interleaved bullets across two roles each preserve their own within-role order", () => {
    const role0BulletA: Bullet = {
      id: "order-3",
      text: "Led the checkout redesign from kickoff to launch.",
      grounding: "grounded",
      source: { kind: "cv", sentence: "Led the checkout redesign project" },
      includedInExport: true,
    };
    const role1BulletA: Bullet = {
      id: "order-4",
      text: "Migrated billing to Postgres with zero downtime.",
      grounding: "grounded",
      source: { kind: "cv", sentence: "Migrated the billing service to Postgres" },
      includedInExport: true,
    };
    const role0BulletB: Bullet = {
      id: "order-5",
      text: "Owned the on-call rotation for three quarters.",
      grounding: "grounded",
      source: { kind: "cv", sentence: "Owned the on-call rotation" },
      includedInExport: true,
    };
    const role1BulletB: Bullet = {
      id: "order-6",
      text: "Wrote and shipped the initial API gateway.",
      grounding: "grounded",
      source: { kind: "cv", sentence: "Wrote the initial API gateway" },
      includedInExport: true,
    };
    const doc = buildExportDocument(
      [role0BulletA, role1BulletA, role0BulletB, role1BulletB],
      { cvDocument: twoRoleDoc },
    );
    const roles = doc.sections!.experience!;
    expect(roles[0].bullets).toEqual([role0BulletA.text, role0BulletB.text]);
    expect(roles[1].bullets).toEqual([role1BulletA.text, role1BulletB.text]);
  });
});

// ---------------------------------------------------------------------------
// (d) HONESTY INVARIANT: multiset of all texts across roles == kept-bullet texts
// ---------------------------------------------------------------------------

describe("attribution honesty invariant: role distribution never adds, drops, or duplicates a kept bullet", () => {
  function sortedCounts(texts: readonly string[]): string[] {
    return [...texts].sort();
  }

  it("the multiset of texts across all experience roles equals exactly the kept-bullet texts", () => {
    const matchesRole0: Bullet = {
      id: "inv-1",
      text: "Led the checkout redesign end-to-end.",
      grounding: "grounded",
      source: { kind: "cv", sentence: "Led the checkout redesign project" },
      includedInExport: true,
    };
    const matchesRole1: Bullet = {
      id: "inv-2",
      text: "Migrated billing to Postgres.",
      grounding: "grounded",
      source: { kind: "cv", sentence: "Migrated the billing service to Postgres" },
      includedInExport: true,
    };
    const userConfirmed: Bullet = {
      id: "inv-3",
      text: "Mentored two junior engineers.",
      grounding: "grounded",
      source: { kind: "user-confirmed", question: "Mentor anyone?", answer: "Yes." },
      includedInExport: true,
    };
    const noMatch: Bullet = {
      id: "inv-4",
      text: "Automated the release pipeline.",
      grounding: "grounded",
      source: { kind: "cv", sentence: "No corresponding line anywhere on the CV" },
      includedInExport: true,
    };
    const excluded: Bullet = {
      id: "inv-5",
      text: "Raised $10M in Series B funding.",
      grounding: "overclaim-risk",
      includedInExport: false,
    };

    const bullets = [matchesRole0, matchesRole1, userConfirmed, noMatch, excluded];
    const doc = buildExportDocument(bullets, { cvDocument: twoRoleDoc });

    const kept = bullets.filter((b) => b.includedInExport).map((b) => b.text);
    const roles = doc.sections!.experience!;
    const acrossRoles = roles.flatMap((r) => r.bullets);

    // Same count, same members — no addition, drop, or duplication.
    expect(acrossRoles).toHaveLength(kept.length);
    expect(sortedCounts(acrossRoles)).toEqual(sortedCounts(kept));

    // Flat doc.bullets is the same kept set too (§4.4 fallback parity).
    expect(sortedCounts(doc.bullets)).toEqual(sortedCounts(kept));

    // The excluded bullet is in neither.
    expect(acrossRoles).not.toContain(excluded.text);
    expect(doc.bullets).not.toContain(excluded.text);
  });

  it("no kept bullet is duplicated across two roles even when several attribute to the same role", () => {
    const a: Bullet = {
      id: "inv-6",
      text: "Led the checkout redesign.",
      grounding: "grounded",
      source: { kind: "cv", sentence: "Led the checkout redesign project" },
      includedInExport: true,
    };
    const b: Bullet = {
      id: "inv-7",
      text: "Owned the on-call rotation for a year.",
      grounding: "grounded",
      source: { kind: "cv", sentence: "Owned the on-call rotation" },
      includedInExport: true,
    };
    const doc = buildExportDocument([a, b], { cvDocument: twoRoleDoc });
    const roles = doc.sections!.experience!;
    const acrossRoles = roles.flatMap((r) => r.bullets);
    expect(acrossRoles).toHaveLength(2);
    expect(new Set(acrossRoles).size).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// (e) empty roles → flat fallback
// ---------------------------------------------------------------------------

describe("attribution with no experience roles: flat fallback", () => {
  it("cvDocument with empty experience omits sections.experience and keeps flat bullets = kept texts", () => {
    const emptyExperienceDoc: CvDocument = { experience: [], skills: ["go"] };
    const bullet: Bullet = {
      id: "empty-1",
      text: "Built a distributed job scheduler.",
      grounding: "grounded",
      source: { kind: "cv", sentence: "Built a distributed job scheduler in Go" },
      includedInExport: true,
    };
    const doc = buildExportDocument([bullet], { cvDocument: emptyExperienceDoc });
    expect(doc.sections?.experience).toBeUndefined();
    expect(doc.bullets).toEqual([bullet.text]);
  });
});

// ---------------------------------------------------------------------------
// (f) tolerant matching: case/whitespace-insensitive, either-direction contains
// ---------------------------------------------------------------------------

describe("attributeRoleIndex: tolerant matching (case + whitespace insensitive)", () => {
  it("evidence that differs only in CASE from the role line still matches", () => {
    const bullet: Bullet = {
      id: "tol-1",
      text: "Delivered a Postgres-backed billing migration.",
      grounding: "grounded",
      source: { kind: "cv", sentence: "MIGRATED THE BILLING SERVICE TO POSTGRES" },
      includedInExport: true,
    };
    const doc = buildExportDocument([bullet], { cvDocument: twoRoleDoc });
    const roles = doc.sections!.experience!;
    expect(roles[1].bullets).toContain(bullet.text);
    expect(roles[0].bullets).not.toContain(bullet.text);
  });

  it("evidence that differs only in WHITESPACE from the role line still matches", () => {
    const bullet: Bullet = {
      id: "tol-2",
      text: "Delivered a Postgres-backed billing migration.",
      grounding: "grounded",
      source: { kind: "cv", sentence: "Migrated   the billing   service to Postgres" },
      includedInExport: true,
    };
    const doc = buildExportDocument([bullet], { cvDocument: twoRoleDoc });
    const roles = doc.sections!.experience!;
    expect(roles[1].bullets).toContain(bullet.text);
    expect(roles[0].bullets).not.toContain(bullet.text);
  });

  it("evidence differing in BOTH case and whitespace, and only a substring of the role line, still matches (contains either direction)", () => {
    const bullet: Bullet = {
      id: "tol-3",
      text: "Rebuilt the checkout flow from the ground up.",
      grounding: "grounded",
      // Substring of the role line "Led the checkout redesign project", differently
      // cased and spaced — exercises the tolerant "line.includes(evidence)" branch.
      source: { kind: "cv", sentence: "the   CHECKOUT redesign" },
      includedInExport: true,
    };
    const doc = buildExportDocument([bullet], { cvDocument: twoRoleDoc });
    const roles = doc.sections!.experience!;
    expect(roles[0].bullets).toContain(bullet.text);
    expect(roles[1].bullets).not.toContain(bullet.text);
  });

  it("evidence that is a SUPERSET of the role line (role line is substring of evidence) still matches", () => {
    const bullet: Bullet = {
      id: "tol-4",
      text: "Shipped the new API gateway with auth support.",
      grounding: "grounded",
      // Evidence sentence is longer than, and contains, the role's original line.
      source: {
        kind: "cv",
        sentence: "In 2019 I wrote the initial API gateway for the platform team",
      },
      includedInExport: true,
    };
    const doc = buildExportDocument([bullet], { cvDocument: twoRoleDoc });
    const roles = doc.sections!.experience!;
    expect(roles[1].bullets).toContain(bullet.text);
    expect(roles[0].bullets).not.toContain(bullet.text);
  });
});
