import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { logout } from "@/app/login/actions";
import { prisma } from "@/lib/prisma";
import { NIGHTSTAND_PRODUCT_TYPE_NAME } from "@/lib/constants";
import { ConfiguratorForm } from "./ConfiguratorForm";

export const dynamic = "force-dynamic";

export default async function ManagerPage() {
  const [productType, colors, materials, hardwareItems] = await Promise.all([
    prisma.productType.findUniqueOrThrow({
      where: { name: NIGHTSTAND_PRODUCT_TYPE_NAME },
    }),
    prisma.color.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.material.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.hardwareItem.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <Container maxWidth="sm" sx={{ my: 4 }}>
      <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
        <Typography variant="h4" component="h1">
          Конфігуратор виробів
        </Typography>
        <Box component="form" action={logout}>
          <Button type="submit" variant="outlined">
            Вийти
          </Button>
        </Box>
      </Stack>
      <ConfiguratorForm
        productType={{ id: productType.id, name: productType.name }}
        colors={colors}
        materials={materials}
        hardwareItems={hardwareItems}
      />
    </Container>
  );
}
