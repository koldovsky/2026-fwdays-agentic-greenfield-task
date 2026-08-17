import { access, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getDocsDir } from "./data-root";
import { InvalidGuidError, SessionNotFoundError } from "./errors";
import { isValidGuid, sessionPath } from "./guid";
import {
  copySessionFields,
  createSession,
  readSession,
  updateSession,
} from "./store";

describe("document-session store", () => {
  let dataRoot: string;

  beforeEach(async () => {
    dataRoot = await mkdtemp(path.join(tmpdir(), "doc-session-"));
  });

  afterEach(async () => {
    await rm(dataRoot, { recursive: true, force: true });
  });

  it("createSession writes defaults and UUID file", async () => {
    const session = await createSession({ dataRoot });

    expect(isValidGuid(session.guid)).toBe(true);
    expect(session["doc-type"]).toBe("invoice_act");
    expect(session["current-step"]).toBe(1);
    expect(session.completed).toBe(false);
    expect(session.services).toEqual([]);
    expect(session.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(session["updated-at"]).toBeTruthy();

    const onDisk = JSON.parse(
      await readFile(sessionPath(session.guid, dataRoot), "utf8"),
    );
    expect(onDisk).toEqual(session);
    expect(getDocsDir(dataRoot)).toBe(path.join(dataRoot, "docs"));
  });

  it("readSession round-trips created session", async () => {
    const created = await createSession({ dataRoot });
    const read = await readSession(created.guid, { dataRoot });
    expect(read).toEqual(created);
  });

  it("updateSession merges fields and bumps updated-at", async () => {
    const created = await createSession({ dataRoot });
    const before = created["updated-at"];

    await new Promise((r) => setTimeout(r, 5));

    const updated = await updateSession(
      created.guid,
      { "current-step": 4, completed: false },
      { dataRoot },
    );

    expect(updated["current-step"]).toBe(4);
    expect(updated.guid).toBe(created.guid);
    expect(updated["updated-at"]).not.toBe(before);

    const read = await readSession(created.guid, { dataRoot });
    expect(read["current-step"]).toBe(4);
  });

  it("rejects invalid guid without writing", async () => {
    await expect(readSession("../etc/passwd", { dataRoot })).rejects.toBeInstanceOf(
      InvalidGuidError,
    );
    await expect(readSession("not-a-uuid", { dataRoot })).rejects.toBeInstanceOf(
      InvalidGuidError,
    );
    await expect(sessionPath.bind(null, "abc")).toThrow(InvalidGuidError);

    await expect(
      access(path.join(dataRoot, "docs", "not-a-uuid.json")),
    ).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("missing file is not-found and does not create a file", async () => {
    const guid = "550e8400-e29b-41d4-a716-446655440000";
    const file = sessionPath(guid, dataRoot);

    await expect(readSession(guid, { dataRoot })).rejects.toBeInstanceOf(
      SessionNotFoundError,
    );
    await expect(access(file)).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("rejects unknown doc-type on update", async () => {
    const created = await createSession({ dataRoot });
    await expect(
      updateSession(
        created.guid,
        // @ts-expect-error intentional invalid value
        { "doc-type": "contract" },
        { dataRoot },
      ),
    ).rejects.toThrow(/Invalid doc-type/);
    const read = await readSession(created.guid, { dataRoot });
    expect(read["doc-type"]).toBe("invoice_act");
  });

  it("copySessionFields merges business fields and omits numbers", async () => {
    const source = await createSession({ dataRoot });
    const target = await createSession({ dataRoot });

    await updateSession(
      source.guid,
      {
        "doc-type": "invoice",
        date: "2026-03-15",
        "invoice-number": "INV-99",
        "act-number": "ACT-99",
        client: {
          "full-name": "Клієнт",
          inn: "1234567890",
          phone: "+380501112233",
          acc: "UA00",
          bank: "Bank",
          "mfo-bank": "300001",
          addr: "Kyiv",
        },
        "done-by": {
          "full-name": "Виконавець",
          inn: "0987654321",
          phone: "+380509998877",
          acc: "UA11",
          bank: "Bank2",
          "mfo-bank": "300002",
          addr: "Lviv",
        },
        services: [
          {
            "sign-name": "svc",
            "service-name": "Послуга",
            amount: 1,
            price: 100,
          },
        ],
      },
      { dataRoot },
    );

    await updateSession(
      target.guid,
      {
        "current-step": 3,
        "invoice-number": "KEEP-ME",
        "act-number": "KEEP-ME-TOO",
      },
      { dataRoot },
    );

    const copied = await copySessionFields(target.guid, source.guid, {
      dataRoot,
    });

    expect(copied.guid).toBe(target.guid);
    expect(copied["current-step"]).toBe(3);
    expect(copied.completed).toBe(false);
    expect(copied["doc-type"]).toBe("invoice");
    expect(copied.date).toBe("2026-03-15");
    expect(copied.client?.["full-name"]).toBe("Клієнт");
    expect(copied["done-by"]?.["full-name"]).toBe("Виконавець");
    expect(copied.services).toHaveLength(1);
    expect(copied["copied-from"]).toBe(source.guid);
    expect(copied["invoice-number"]).toBeUndefined();
    expect(copied["act-number"]).toBeUndefined();

    const onDisk = await readSession(target.guid, { dataRoot });
    expect(onDisk["invoice-number"]).toBeUndefined();
    expect(onDisk["act-number"]).toBeUndefined();
  });

  it("copySessionFields does not mutate target when source is missing", async () => {
    const target = await createSession({ dataRoot });
    await updateSession(
      target.guid,
      { "doc-type": "act", "invoice-number": "T-1" },
      { dataRoot },
    );
    const before = await readSession(target.guid, { dataRoot });

    await expect(
      copySessionFields(
        target.guid,
        "550e8400-e29b-41d4-a716-446655440000",
        { dataRoot },
      ),
    ).rejects.toBeInstanceOf(SessionNotFoundError);

    const after = await readSession(target.guid, { dataRoot });
    expect(after).toEqual(before);
  });

  it("copySessionFields rejects invalid source guid without mutating target", async () => {
    const target = await createSession({ dataRoot });
    const before = await readSession(target.guid, { dataRoot });

    await expect(
      copySessionFields(target.guid, "not-a-uuid", { dataRoot }),
    ).rejects.toBeInstanceOf(InvalidGuidError);

    const after = await readSession(target.guid, { dataRoot });
    expect(after).toEqual(before);
  });
});
