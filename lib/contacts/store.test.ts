import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { ContactRef } from "../document-session";
import { InvalidContactError } from "./errors";
import { contactPath, getContact, listContacts, putContact } from "./store";

const sample = (overrides: Partial<ContactRef> = {}): ContactRef => ({
  "full-name": "ТОВ Приклад",
  inn: "1234567890",
  phone: "+380501112233",
  acc: "UA123456789012345678901234567",
  bank: "ПриватБанк",
  "mfo-bank": "305299",
  addr: "м. Київ, вул. Хрещатик, 1",
  ...overrides,
});

describe("contacts store", () => {
  let dataRoot: string;

  beforeEach(async () => {
    dataRoot = await mkdtemp(path.join(tmpdir(), "contacts-"));
  });

  afterEach(async () => {
    await rm(dataRoot, { recursive: true, force: true });
  });

  it("create writes file with all fields (TC-11)", async () => {
    const contact = sample();
    const saved = await putContact(contact, { dataRoot });

    expect(saved).toEqual(contact);

    const onDisk = JSON.parse(
      await readFile(contactPath(contact.inn, dataRoot), "utf8"),
    ) as ContactRef;
    expect(onDisk).toEqual(contact);
  });

  it("update same inn overwrites the same file (NFR-05)", async () => {
    await putContact(sample(), { dataRoot });
    const updated = sample({
      "full-name": "ФОП Оновлений",
      phone: "+380671234567",
    });
    await putContact(updated, { dataRoot });

    const files = (await readdir(path.join(dataRoot, "contacts"))).filter(
      (n) => n.endsWith(".json"),
    );
    expect(files).toEqual(["1234567890.json"]);

    const loaded = await getContact("1234567890", { dataRoot });
    expect(loaded["full-name"]).toBe("ФОП Оновлений");
    expect(loaded.phone).toBe("+380671234567");
  });

  it("empty inn is rejected (TC-26)", async () => {
    await expect(
      putContact(sample({ inn: "   " }), { dataRoot }),
    ).rejects.toBeInstanceOf(InvalidContactError);

    await expect(
      putContact(sample({ inn: "" }), { dataRoot }),
    ).rejects.toThrow(/inn/);
  });

  it("path-unsafe inn is rejected", async () => {
    await expect(
      putContact(sample({ inn: "../evil" }), { dataRoot }),
    ).rejects.toBeInstanceOf(InvalidContactError);

    await expect(
      putContact(sample({ inn: "a/b" }), { dataRoot }),
    ).rejects.toBeInstanceOf(InvalidContactError);
  });

  it("missing required field is rejected", async () => {
    await expect(
      putContact(sample({ phone: "  " }), { dataRoot }),
    ).rejects.toThrow(/phone/);
  });

  it("list returns saved contacts and filters by q", async () => {
    await putContact(sample({ inn: "111", "full-name": "Альфа" }), {
      dataRoot,
    });
    await putContact(sample({ inn: "222", "full-name": "Бета" }), {
      dataRoot,
    });

    const all = await listContacts({ dataRoot });
    expect(all).toHaveLength(2);
    expect(all.map((c) => c.inn)).toEqual(["111", "222"]);

    const byName = await listContacts({ dataRoot, q: "бета" });
    expect(byName).toHaveLength(1);
    expect(byName[0].inn).toBe("222");

    const byInn = await listContacts({ dataRoot, q: "111" });
    expect(byInn).toHaveLength(1);
    expect(byInn[0]["full-name"]).toBe("Альфа");
  });

  it("list returns empty array when contacts dir is missing", async () => {
    expect(await listContacts({ dataRoot })).toEqual([]);
  });

  it("session snapshot + reload keeps same guid (TC-11/13, NFR-04)", async () => {
    const { createSession, updateSession, readSession } = await import(
      "../document-session"
    );
    const client = sample({ inn: "3333333333", "full-name": "Замовник" });
    const doneBy = sample({ inn: "4444444444", "full-name": "Виконавець" });

    await putContact(client, { dataRoot });
    await putContact(doneBy, { dataRoot });

    const session = await createSession({ dataRoot });
    await updateSession(
      session.guid,
      { client, "done-by": doneBy, "current-step": 5 },
      { dataRoot },
    );

    const reloaded = await readSession(session.guid, { dataRoot });
    expect(reloaded.guid).toBe(session.guid);
    expect(reloaded.client).toEqual(client);
    expect(reloaded["done-by"]).toEqual(doneBy);
    expect(reloaded["current-step"]).toBe(5);
  });
});
