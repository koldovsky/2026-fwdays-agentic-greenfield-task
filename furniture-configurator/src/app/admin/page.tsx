import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { logout } from "@/app/login/actions";
import { prisma } from "@/lib/prisma";
import { NIGHTSTAND_PRODUCT_TYPE_NAME } from "@/lib/constants";
import { SimpleDictionarySection } from "./SimpleDictionarySection";
import { HardwareSection } from "./HardwareSection";
import { StandardSizesSection } from "./StandardSizesSection";
import { PartSpecsSection } from "./PartSpecsSection";
import { CatalogEntriesSection } from "./CatalogEntriesSection";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const [colors, materials, hardwareItems, standardSizes, productType, catalogEntries] =
    await Promise.all([
      prisma.color.findMany({ orderBy: { name: "asc" } }),
      prisma.material.findMany({ orderBy: { name: "asc" } }),
      prisma.hardwareItem.findMany({ orderBy: { name: "asc" } }),
      prisma.standardSize.findMany({
        orderBy: [{ dimensionType: "asc" }, { valueCm: "asc" }],
      }),
      prisma.productType.findUniqueOrThrow({
        where: { name: NIGHTSTAND_PRODUCT_TYPE_NAME },
        include: { partSpecs: true },
      }),
      prisma.catalogEntry.findMany({
        include: { facadeColor: true, facadeMaterial: true, corpusMaterial: true },
        orderBy: { createdAt: "desc" },
      }),
    ]);

  return (
    <Container maxWidth="md" sx={{ my: 4 }}>
      <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
        <Typography variant="h4" component="h1">
          Керування довідниками
        </Typography>
        <Box component="form" action={logout}>
          <Button type="submit" variant="outlined">
            Вийти
          </Button>
        </Box>
      </Stack>

      <SimpleDictionarySection
        title="Кольори"
        resourcePath="/api/colors"
        listKey="colors"
        itemKey="color"
        initialItems={colors}
      />
      <SimpleDictionarySection
        title="Матеріали"
        resourcePath="/api/materials"
        listKey="materials"
        itemKey="material"
        initialItems={materials}
      />
      <HardwareSection initialItems={hardwareItems} />
      <StandardSizesSection initialItems={standardSizes} />
      <PartSpecsSection initialItems={productType.partSpecs} />
      <CatalogEntriesSection initialItems={catalogEntries} />
    </Container>
  );
}
