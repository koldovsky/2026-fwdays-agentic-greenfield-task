import "server-only";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Database } from "./types";

const root = process.env.DATA_DIR ?? path.join(process.cwd(), "data");
const files = { users: "users.json", suppliers: "suppliers.json", rawMaterials: "raw_materials.json", finishedGoods: "finished_goods.json", boms: "bom.json", purchaseOrders: "purchase_orders.json", stockMovements: "stock_movements.json" } as const;
let queue = Promise.resolve();

export async function readDatabase(): Promise<Database> {
  const entries = await Promise.all(Object.entries(files).map(async ([key, file]) => [key, JSON.parse(await readFile(path.join(root, file), "utf8"))]));
  return Object.fromEntries(entries) as unknown as Database;
}

export function transaction(mutator: (data: Database) => Database | Promise<Database>): Promise<Database> {
  const operation = queue.then(async () => {
    await mkdir(root, { recursive: true });
    const current = await readDatabase();
    const next = await mutator(structuredClone(current));
    const token = crypto.randomUUID();
    const staged: Array<{ target: string; temp: string; backup: string }> = [];
    try {
      for (const [key, file] of Object.entries(files)) {
        const target = path.join(root, file);
        const temp = `${target}.${token}.tmp`;
        const backup = `${target}.${token}.bak`;
        await writeFile(temp, `${JSON.stringify(next[key as keyof Database], null, 2)}\n`, "utf8");
        await writeFile(backup, await readFile(target));
        staged.push({ target, temp, backup });
      }
      for (const item of staged) await rename(item.temp, item.target);
      return next;
    } catch (error) {
      for (const item of staged) {
        try { await rename(item.backup, item.target); } catch { /* original still present */ }
      }
      throw error;
    } finally {
      await Promise.all(staged.flatMap((item) => [rm(item.temp, { force: true }), rm(item.backup, { force: true })]));
    }
  });
  queue = operation.then(() => undefined, () => undefined);
  return operation;
}

