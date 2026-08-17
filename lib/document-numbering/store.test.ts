import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createSession, updateSession } from "../document-session";
import { InvalidDateError } from "./errors";
import {
  docNumberPath,
  issueNumbersForSession,
  readOrInitCounter,
} from "./store";
import type { DocNumberCounter } from "./types";

describe("document-numbering store", () => {
  let dataRoot: string;

  beforeEach(async () => {
    dataRoot = await mkdtemp(path.join(tmpdir(), "doc-numbering-"));
  });

  afterEach(async () => {
    await rm(dataRoot, { recursive: true, force: true });
  });

  async function readCounter(year: number): Promise<DocNumberCounter> {
    return JSON.parse(
      await readFile(docNumberPath(year, dataRoot), "utf8"),
    ) as DocNumberCounter;
  }

  it("first invoice of the year is Р-0000001 (TC-08)", async () => {
    const session = await createSession({ dataRoot });
    await updateSession(session.guid, { "doc-type": "invoice" }, { dataRoot });

    const issued = await issueNumbersForSession(
      session.guid,
      "2026-03-15",
      { dataRoot },
    );

    expect(issued.date).toBe("2026-03-15");
    expect(issued["invoice-number"]).toBe("Р-0000001");
    expect(issued["act-number"]).toBeUndefined();

    const counter = await readCounter(2026);
    expect(counter).toEqual({
      year: 2026,
      "last-invoice-seq": 1,
      "last-act-seq": 0,
    });
  });

  it("next invoice same year increments (TC-09)", async () => {
    const first = await createSession({ dataRoot });
    await updateSession(first.guid, { "doc-type": "invoice" }, { dataRoot });
    await issueNumbersForSession(first.guid, "2026-01-10", { dataRoot });

    const second = await createSession({ dataRoot });
    await updateSession(second.guid, { "doc-type": "invoice" }, { dataRoot });
    const issued = await issueNumbersForSession(
      second.guid,
      "2026-06-20",
      { dataRoot },
    );

    expect(issued["invoice-number"]).toBe("Р-0000002");
    const counter = await readCounter(2026);
    expect(counter["last-invoice-seq"]).toBe(2);
  });

  it("other year uses separate counter file (TC-10)", async () => {
    const a = await createSession({ dataRoot });
    await updateSession(a.guid, { "doc-type": "invoice" }, { dataRoot });
    await issueNumbersForSession(a.guid, "2026-12-01", { dataRoot });

    const b = await createSession({ dataRoot });
    await updateSession(b.guid, { "doc-type": "invoice" }, { dataRoot });
    const issued = await issueNumbersForSession(b.guid, "2025-01-05", {
      dataRoot,
    });

    expect(issued["invoice-number"]).toBe("Р-0000001");
    expect(await readCounter(2026)).toMatchObject({ "last-invoice-seq": 1 });
    expect(await readCounter(2025)).toMatchObject({
      year: 2025,
      "last-invoice-seq": 1,
    });
  });

  it("is idempotent when numbers already set", async () => {
    const session = await createSession({ dataRoot });
    await updateSession(
      session.guid,
      { "doc-type": "invoice_act" },
      { dataRoot },
    );
    const first = await issueNumbersForSession(
      session.guid,
      "2026-04-01",
      { dataRoot },
    );
    const second = await issueNumbersForSession(
      session.guid,
      "2026-05-01",
      { dataRoot },
    );

    expect(second["invoice-number"]).toBe(first["invoice-number"]);
    expect(second["act-number"]).toBe(first["act-number"]);
    expect(second.date).toBe("2026-05-01");
    expect(await readCounter(2026)).toEqual({
      year: 2026,
      "last-invoice-seq": 1,
      "last-act-seq": 1,
    });
  });

  it("invoice_act issues both numbers", async () => {
    const session = await createSession({ dataRoot });
    const issued = await issueNumbersForSession(
      session.guid,
      "2026-02-01",
      { dataRoot },
    );

    expect(session["doc-type"]).toBe("invoice_act");
    expect(issued["invoice-number"]).toBe("Р-0000001");
    expect(issued["act-number"]).toBe("1");
  });

  it("act-only skips invoice number", async () => {
    const session = await createSession({ dataRoot });
    await updateSession(session.guid, { "doc-type": "act" }, { dataRoot });

    const issued = await issueNumbersForSession(
      session.guid,
      "2026-02-01",
      { dataRoot },
    );

    expect(issued["act-number"]).toBe("1");
    expect(issued["invoice-number"]).toBeUndefined();
    expect(await readCounter(2026)).toMatchObject({
      "last-invoice-seq": 0,
      "last-act-seq": 1,
    });
  });

  it("rejects invalid date", async () => {
    const session = await createSession({ dataRoot });
    await expect(
      issueNumbersForSession(session.guid, "2026-13-40", { dataRoot }),
    ).rejects.toBeInstanceOf(InvalidDateError);
    await expect(
      issueNumbersForSession(session.guid, "not-a-date", { dataRoot }),
    ).rejects.toBeInstanceOf(InvalidDateError);
  });

  it("readOrInitCounter creates zeros when missing", async () => {
    const counter = await readOrInitCounter(2030, { dataRoot });
    expect(counter).toEqual({
      year: 2030,
      "last-invoice-seq": 0,
      "last-act-seq": 0,
    });
    expect(await readCounter(2030)).toEqual(counter);
  });
});
