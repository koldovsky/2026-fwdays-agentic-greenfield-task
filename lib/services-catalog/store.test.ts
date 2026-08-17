import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { ServiceLine } from "../document-session";
import { InvalidServiceError } from "./errors";
import {
  getServicesCatalogPath,
  readServicesCatalog,
  upsertServicesIntoCatalog,
  writeServicesCatalog,
} from "./store";

const sample = (overrides: Partial<ServiceLine> = {}): ServiceLine => ({
  "sign-name": "конс",
  "service-name": "Консультація",
  amount: 1,
  price: 1000,
  ...overrides,
});

describe("services catalog store", () => {
  let dataRoot: string;

  beforeEach(async () => {
    dataRoot = await mkdtemp(path.join(tmpdir(), "services-"));
  });

  afterEach(async () => {
    await rm(dataRoot, { recursive: true, force: true });
  });

  it("write creates jobs/services.json", async () => {
    const line = sample();
    const saved = await writeServicesCatalog([line], { dataRoot });

    expect(saved).toEqual([line]);

    const onDisk = JSON.parse(
      await readFile(getServicesCatalogPath(dataRoot), "utf8"),
    ) as ServiceLine[];
    expect(onDisk).toEqual([line]);
  });

  it("upsert same sign-name overwrites", async () => {
    await writeServicesCatalog([sample()], { dataRoot });
    await upsertServicesIntoCatalog(
      [sample({ "service-name": "Оновлена консультація", price: 1500 })],
      { dataRoot },
    );

    const catalog = await readServicesCatalog({ dataRoot });
    expect(catalog).toHaveLength(1);
    expect(catalog[0]["service-name"]).toBe("Оновлена консультація");
    expect(catalog[0].price).toBe(1500);
  });

  it("two distinct services persist (TC-14)", async () => {
    const a = sample({ "sign-name": "конс", "service-name": "Консультація" });
    const b = sample({
      "sign-name": "розр",
      "service-name": "Розробка",
      amount: 2,
      price: 5000,
    });

    await upsertServicesIntoCatalog([a, b], { dataRoot });

    const catalog = await readServicesCatalog({ dataRoot });
    expect(catalog).toHaveLength(2);
    expect(catalog.map((e) => e["sign-name"]).toSorted()).toEqual([
      "конс",
      "розр",
    ]);

    const { createSession, updateSession, readSession } = await import(
      "../document-session"
    );
    const session = await createSession({ dataRoot });
    await updateSession(
      session.guid,
      { services: [a, b], "current-step": 5 },
      { dataRoot },
    );
    const reloaded = await readSession(session.guid, { dataRoot });
    expect(reloaded.guid).toBe(session.guid);
    expect(reloaded.services).toEqual([a, b]);
  });

  it("missing catalog file reads as empty array", async () => {
    expect(await readServicesCatalog({ dataRoot })).toEqual([]);
  });

  it("empty / invalid entries are rejected", async () => {
    await expect(writeServicesCatalog([], { dataRoot })).resolves.toEqual([]);

    await expect(
      writeServicesCatalog([{ "sign-name": "  ", "service-name": "x" }], {
        dataRoot,
      }),
    ).rejects.toBeInstanceOf(InvalidServiceError);

    await expect(
      writeServicesCatalog(
        [{ "sign-name": "a", "service-name": "  ", amount: 1, price: 1 }],
        { dataRoot },
      ),
    ).rejects.toThrow(/service-name/);

    await expect(
      upsertServicesIntoCatalog(
        [sample({ amount: 0 })],
        { dataRoot },
      ),
    ).rejects.toThrow(/amount/);

    await expect(
      upsertServicesIntoCatalog(
        [sample({ price: -1 })],
        { dataRoot },
      ),
    ).rejects.toThrow(/price/);

    await expect(
      upsertServicesIntoCatalog([], { dataRoot }),
    ).rejects.toThrow(/At least one/);
  });
});
