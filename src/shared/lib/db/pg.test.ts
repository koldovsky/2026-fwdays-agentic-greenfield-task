// Resilience contract for the pg adapter: a stale-connection reset self-heals
// with a single retry (the fix for the DELETE /api/account `read ECONNRESET`),
// while genuine query errors surface immediately. Also covers getDatabaseSsl.
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Pool } from "pg";
import { getDatabaseSsl } from "@/shared/config";
import { createPgQueryable } from "./pg";

function connErr(code: string): Error & { code: string } {
  return Object.assign(new Error(code), { code });
}

/** Minimal Pool-like stub — createPgQueryable only touches `.query`. */
function fakePool(query: (...args: unknown[]) => unknown): Pool {
  return { query: vi.fn(query) } as unknown as Pool;
}

describe("createPgQueryable retry", () => {
  it("retries once on a connection reset and returns the second result", async () => {
    let calls = 0;
    const pool = fakePool(() => {
      calls += 1;
      if (calls === 1) throw connErr("ECONNRESET");
      return { rows: [{ ok: true }] };
    });
    const db = createPgQueryable(pool);
    const { rows } = await db.query("SELECT 1");
    expect(rows).toEqual([{ ok: true }]);
    expect(calls).toBe(2);
  });

  it("does not retry a non-connection error (e.g. constraint violation)", async () => {
    let calls = 0;
    const pool = fakePool(() => {
      calls += 1;
      throw connErr("23505"); // unique_violation
    });
    const db = createPgQueryable(pool);
    await expect(db.query("INSERT ...")).rejects.toMatchObject({ code: "23505" });
    expect(calls).toBe(1);
  });

  it("retries at most once, then surfaces a persistent reset", async () => {
    let calls = 0;
    const pool = fakePool(() => {
      calls += 1;
      throw connErr("ECONNRESET");
    });
    const db = createPgQueryable(pool);
    await expect(db.query("SELECT 1")).rejects.toMatchObject({ code: "ECONNRESET" });
    expect(calls).toBe(2);
  });

  it("forwards params on the retry", async () => {
    const seen: unknown[][] = [];
    let calls = 0;
    const pool = fakePool((_sql, params) => {
      calls += 1;
      seen.push(params as unknown[]);
      if (calls === 1) throw connErr("ETIMEDOUT");
      return { rows: [] };
    });
    const db = createPgQueryable(pool);
    await db.query("SELECT $1", ["x"]);
    expect(seen).toEqual([["x"], ["x"]]);
  });
});

describe("getDatabaseSsl", () => {
  const original = process.env.DATABASE_SSL;
  afterEach(() => {
    if (original === undefined) delete process.env.DATABASE_SSL;
    else process.env.DATABASE_SSL = original;
  });

  it("defaults off outside production (test env)", () => {
    delete process.env.DATABASE_SSL;
    expect(getDatabaseSsl()).toBe(false);
  });

  it("enables verified TLS on require/true/on", () => {
    for (const v of ["require", "true", "on", "REQUIRE"]) {
      process.env.DATABASE_SSL = v;
      expect(getDatabaseSsl()).toBe(true);
    }
  });

  it("disables TLS on disable/false/off", () => {
    for (const v of ["disable", "false", "off"]) {
      process.env.DATABASE_SSL = v;
      expect(getDatabaseSsl()).toBe(false);
    }
  });

  it("allows unverified TLS for self-signed hosts", () => {
    process.env.DATABASE_SSL = "no-verify";
    expect(getDatabaseSsl()).toEqual({ rejectUnauthorized: false });
  });
});
