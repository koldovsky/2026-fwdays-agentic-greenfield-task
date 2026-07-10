"use client";

import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import {
  useCatalogEntriesQuery,
  useToggleCatalogEntryActiveMutation,
  type CatalogEntryEntry,
} from "@/lib/queries/useCatalogEntries";

export function CatalogEntriesSection({
  initialItems,
}: {
  initialItems: CatalogEntryEntry[];
}) {
  const { data: items } = useCatalogEntriesQuery(initialItems);
  const toggleMutation = useToggleCatalogEntryActiveMutation();

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" component="h2" sx={{ mb: 2 }}>
        Каталог стандартних партій
      </Typography>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>SKU</TableCell>
            <TableCell>Верх, см</TableCell>
            <TableCell>Низ, см</TableCell>
            <TableCell>Фасад</TableCell>
            <TableCell>Корпус</TableCell>
            <TableCell>Статус</TableCell>
            <TableCell align="right">Дія</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell>
                <strong>{item.sku}</strong>
              </TableCell>
              <TableCell>{item.topSizeCm}</TableCell>
              <TableCell>{item.bottomSizeCm}</TableCell>
              <TableCell>
                {item.facadeMaterial.name}/{item.facadeColor.name}
              </TableCell>
              <TableCell>{item.corpusMaterial.name}</TableCell>
              <TableCell>
                {item.active ? (
                  <Chip label="активна" color="success" size="small" />
                ) : (
                  <Chip label="неактивна" size="small" />
                )}
              </TableCell>
              <TableCell align="right">
                <Button size="small" onClick={() => toggleMutation.mutate(item)}>
                  {item.active ? "Деактивувати" : "Активувати"}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Paper>
  );
}
