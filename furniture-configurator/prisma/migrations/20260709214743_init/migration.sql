-- CreateTable
CREATE TABLE "Color" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "Material" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "HardwareItem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "StandardSize" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "dimensionType" TEXT NOT NULL,
    "valueCm" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "ProductType" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "PartSpec" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "productTypeId" INTEGER NOT NULL,
    "partRole" TEXT NOT NULL,
    "allowsCustomSize" BOOLEAN NOT NULL DEFAULT false,
    "minCm" INTEGER,
    "maxCm" INTEGER,
    CONSTRAINT "PartSpec_productTypeId_fkey" FOREIGN KEY ("productTypeId") REFERENCES "ProductType" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CatalogEntry" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "sku" TEXT NOT NULL,
    "isStandard" BOOLEAN NOT NULL DEFAULT true,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "productTypeId" INTEGER NOT NULL,
    "topSizeCm" INTEGER NOT NULL,
    "bottomSizeCm" INTEGER NOT NULL,
    "facadeColorId" INTEGER NOT NULL,
    "facadeMaterialId" INTEGER NOT NULL,
    "corpusMaterialId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CatalogEntry_productTypeId_fkey" FOREIGN KEY ("productTypeId") REFERENCES "ProductType" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CatalogEntry_facadeColorId_fkey" FOREIGN KEY ("facadeColorId") REFERENCES "Color" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CatalogEntry_facadeMaterialId_fkey" FOREIGN KEY ("facadeMaterialId") REFERENCES "Material" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CatalogEntry_corpusMaterialId_fkey" FOREIGN KEY ("corpusMaterialId") REFERENCES "Material" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "HardwareOption" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "catalogEntryId" INTEGER NOT NULL,
    "hardwareItemId" INTEGER NOT NULL,
    CONSTRAINT "HardwareOption_catalogEntryId_fkey" FOREIGN KEY ("catalogEntryId") REFERENCES "CatalogEntry" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "HardwareOption_hardwareItemId_fkey" FOREIGN KEY ("hardwareItemId") REFERENCES "HardwareItem" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Color_name_key" ON "Color"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Material_name_key" ON "Material"("name");

-- CreateIndex
CREATE UNIQUE INDEX "HardwareItem_name_key" ON "HardwareItem"("name");

-- CreateIndex
CREATE UNIQUE INDEX "HardwareItem_sku_key" ON "HardwareItem"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "StandardSize_dimensionType_valueCm_key" ON "StandardSize"("dimensionType", "valueCm");

-- CreateIndex
CREATE UNIQUE INDEX "ProductType_name_key" ON "ProductType"("name");

-- CreateIndex
CREATE UNIQUE INDEX "PartSpec_productTypeId_partRole_key" ON "PartSpec"("productTypeId", "partRole");

-- CreateIndex
CREATE UNIQUE INDEX "CatalogEntry_sku_key" ON "CatalogEntry"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "HardwareOption_catalogEntryId_hardwareItemId_key" ON "HardwareOption"("catalogEntryId", "hardwareItemId");
