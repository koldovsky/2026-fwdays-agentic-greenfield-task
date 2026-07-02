import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { seedData } from "@/lib/seed";

vi.mock("server-only", () => ({}));

const files = {
  users: "users.json",
  suppliers: "suppliers.json",
  rawMaterials: "raw_materials.json",
  finishedGoods: "finished_goods.json",
  boms: "bom.json",
  purchaseOrders: "purchase_orders.json",
  stockMovements: "stock_movements.json",
} as const;

let dataDir: string;

beforeEach(async () => {
  dataDir = await mkdtemp(path.join(tmpdir(), "forgeflow-repository-"));
  process.env.DATA_DIR = dataDir;
  await Promise.all(Object.entries(files).map(([key, filename]) => writeFile(path.join(dataDir, filename), `${JSON.stringify(seedData[key as keyof typeof seedData], null, 2)}\n`)));
  vi.resetModules();
});

afterEach(async () => {
  delete process.env.DATA_DIR;
  await rm(dataDir, { recursive: true, force: true });
});

describe("JSON repository", () => {
  // @trace FR-37
  it("reads every aggregate through the typed repository boundary", async () => {
    const { readDatabase } = await import("@/lib/repository");
    const data = await readDatabase();
    expect(data.users).toHaveLength(2);
    expect(data.boms[0].bomId).toBe("bom_401");
    expect(data.stockMovements).toHaveLength(3);
  });

  // @trace FR-37 FR-38
  it("serializes concurrent mutations so neither update is lost", async () => {
    const { readDatabase, transaction } = await import("@/lib/repository");
    await Promise.all([
      transaction((data) => { data.rawMaterials[0].quantityInStock += 1; return data; }),
      transaction((data) => { data.rawMaterials[0].quantityInStock += 2; return data; }),
    ]);
    expect((await readDatabase()).rawMaterials[0].quantityInStock).toBe(153);
  });

  // @trace FR-38
  it("leaves every persisted file unchanged when the mutator fails", async () => {
    const { transaction } = await import("@/lib/repository");
    const before = await Promise.all(Object.values(files).map((filename) => readFile(path.join(dataDir, filename), "utf8")));
    await expect(transaction(() => { throw new Error("planned failure"); })).rejects.toThrow("planned failure");
    const after = await Promise.all(Object.values(files).map((filename) => readFile(path.join(dataDir, filename), "utf8")));
    expect(after).toEqual(before);
  });

  // @trace FR-38
  it("restores files already staged when a later aggregate cannot be backed up", async () => {
    const { readDatabase, transaction } = await import("@/lib/repository");
    const usersBefore = await readFile(path.join(dataDir, files.users), "utf8");
    await expect(transaction(async (data) => {
      data.users[0].fullName = "Не має зберегтися";
      const blockedTarget = path.join(dataDir, files.rawMaterials);
      await rm(blockedTarget);
      await mkdir(blockedTarget);
      return data;
    })).rejects.toThrow();
    expect(await readFile(path.join(dataDir, files.users), "utf8")).toBe(usersBefore);
    await rm(path.join(dataDir, files.rawMaterials), { recursive: true, force: true });
    await writeFile(path.join(dataDir, files.rawMaterials), `${JSON.stringify(seedData.rawMaterials, null, 2)}\n`);
    expect((await readDatabase()).users[0].fullName).toBe(seedData.users[0].fullName);
  });
});

// @trace FR-37, FR-38
