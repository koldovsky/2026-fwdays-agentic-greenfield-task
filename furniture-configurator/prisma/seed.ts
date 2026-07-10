import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient, DimensionType, PartRole } from "../src/generated/prisma/client";
import { NIGHTSTAND_PRODUCT_TYPE_NAME } from "../src/lib/constants";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./dev.db",
});
const prisma = new PrismaClient({ adapter });

async function main() {
  // Colors: seeded once as the canonical dictionary entry. Because the
  // configurator only ever lets you pick a color by ID from this list,
  // there is no way to type a near-duplicate like "Кишемір" alongside it.
  const [kashemir, white, sonomaOak] = await Promise.all([
    prisma.color.upsert({
      where: { name: "Кашемір" },
      update: {},
      create: { name: "Кашемір" },
    }),
    prisma.color.upsert({
      where: { name: "Білий" },
      update: {},
      create: { name: "Білий" },
    }),
    prisma.color.upsert({
      where: { name: "Дуб Сонома" },
      update: {},
      create: { name: "Дуб Сонома" },
    }),
  ]);

  const [ldsp, mdf] = await Promise.all([
    prisma.material.upsert({
      where: { name: "ЛДСП" },
      update: {},
      create: { name: "ЛДСП" },
    }),
    prisma.material.upsert({
      where: { name: "МДФ" },
      update: {},
      create: { name: "МДФ" },
    }),
  ]);

  const [handleChrome, railPushToOpen] = await Promise.all([
    prisma.hardwareItem.upsert({
      where: { sku: "HW-HANDLE-CHROME" },
      update: {},
      create: { name: "Ручка хром", sku: "HW-HANDLE-CHROME" },
    }),
    prisma.hardwareItem.upsert({
      where: { sku: "HW-RAIL-PTO" },
      update: {},
      create: { name: "Напрямна push-to-open", sku: "HW-RAIL-PTO" },
    }),
  ]);

  const standardSizes: Array<{ dimensionType: DimensionType; valueCm: number }> = [
    { dimensionType: "WIDTH", valueCm: 40 },
    { dimensionType: "WIDTH", valueCm: 60 },
    { dimensionType: "HEIGHT", valueCm: 45 },
    { dimensionType: "DEPTH", valueCm: 40 },
  ];
  for (const size of standardSizes) {
    await prisma.standardSize.upsert({
      where: {
        dimensionType_valueCm: {
          dimensionType: size.dimensionType,
          valueCm: size.valueCm,
        },
      },
      update: {},
      create: size,
    });
  }

  const nightstand = await prisma.productType.upsert({
    where: { name: NIGHTSTAND_PRODUCT_TYPE_NAME },
    update: {},
    create: { name: NIGHTSTAND_PRODUCT_TYPE_NAME },
  });

  // Only top/bottom are sized parts; facade/corpus are chosen by
  // color/material, not by a size range.
  const partSpecs: Array<{
    partRole: PartRole;
    allowsCustomSize: boolean;
    minCm: number | null;
    maxCm: number | null;
  }> = [
    { partRole: "TOP", allowsCustomSize: true, minCm: 30, maxCm: 80 },
    { partRole: "BOTTOM", allowsCustomSize: true, minCm: 30, maxCm: 80 },
  ];
  for (const spec of partSpecs) {
    await prisma.partSpec.upsert({
      where: {
        productTypeId_partRole: {
          productTypeId: nightstand.id,
          partRole: spec.partRole,
        },
      },
      update: {},
      create: { ...spec, productTypeId: nightstand.id },
    });
  }

  const standardEntry = await prisma.catalogEntry.upsert({
    where: { sku: "TUMBA-STD-001" },
    update: {},
    create: {
      sku: "TUMBA-STD-001",
      isStandard: true,
      productTypeId: nightstand.id,
      topSizeCm: 60,
      bottomSizeCm: 60,
      facadeColorId: kashemir.id,
      facadeMaterialId: mdf.id,
      corpusMaterialId: ldsp.id,
    },
  });

  for (const hardwareItem of [handleChrome, railPushToOpen]) {
    await prisma.hardwareOption.upsert({
      where: {
        catalogEntryId_hardwareItemId: {
          catalogEntryId: standardEntry.id,
          hardwareItemId: hardwareItem.id,
        },
      },
      update: {},
      create: {
        catalogEntryId: standardEntry.id,
        hardwareItemId: hardwareItem.id,
      },
    });
  }

  console.log("Seed complete:", {
    colors: [kashemir.name, white.name, sonomaOak.name],
    materials: [ldsp.name, mdf.name],
    hardware: [handleChrome.sku, railPushToOpen.sku],
    productType: nightstand.name,
    standardCatalogEntry: standardEntry.sku,
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
