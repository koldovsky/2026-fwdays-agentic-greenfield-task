"use client";

import { useState } from "react";
import { useForm } from "@tanstack/react-form";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { toErrorMessage } from "@/lib/queries/fetchJson";
import { validatePositiveInteger } from "@/lib/forms/validators";
import {
  useAddStandardSizeMutation,
  useStandardSizesQuery,
  useToggleStandardSizeActiveMutation,
  type DimensionType,
  type StandardSizeEntry,
} from "@/lib/queries/useStandardSizes";

const DIMENSION_LABELS: Record<DimensionType, string> = {
  WIDTH: "Ширина",
  HEIGHT: "Висота",
  DEPTH: "Глибина",
};

export function StandardSizesSection({
  initialItems,
}: {
  initialItems: StandardSizeEntry[];
}) {
  const { data: items } = useStandardSizesQuery(initialItems);
  const addMutation = useAddStandardSizeMutation();
  const toggleMutation = useToggleStandardSizeActiveMutation();
  const [dialogOpen, setDialogOpen] = useState(false);

  const form = useForm({
    defaultValues: { dimensionType: "WIDTH" as DimensionType, valueCm: 40 },
    onSubmit: async ({ value }) => {
      await addMutation.mutateAsync(value);
      form.reset();
      setDialogOpen(false);
    },
  });

  function closeDialog() {
    setDialogOpen(false);
    addMutation.reset();
  }

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 2 }}>
        <Typography variant="h6" component="h2">
          Стандартні розміри
        </Typography>
        <Button variant="contained" size="small" onClick={() => setDialogOpen(true)}>
          Додати
        </Button>
      </Stack>

      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Вимір</TableCell>
            <TableCell>Значення, см</TableCell>
            <TableCell>Статус</TableCell>
            <TableCell align="right">Дія</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell>{DIMENSION_LABELS[item.dimensionType]}</TableCell>
              <TableCell>{item.valueCm}</TableCell>
              <TableCell>
                {item.active ? (
                  <Chip label="активний" color="success" size="small" />
                ) : (
                  <Chip label="неактивний" size="small" />
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

      <Dialog open={dialogOpen} onClose={closeDialog} fullWidth maxWidth="xs">
        <Box
          component="form"
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit().catch(() => {});
          }}
        >
          <DialogTitle>Додати стандартний розмір</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <form.Field name="dimensionType">
                {(field) => (
                  <FormControl fullWidth>
                    <InputLabel id="dimension-type-label">Вимір</InputLabel>
                    <Select
                      labelId="dimension-type-label"
                      label="Вимір"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value as DimensionType)}
                    >
                      {Object.entries(DIMENSION_LABELS).map(([value, label]) => (
                        <MenuItem key={value} value={value}>
                          {label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
              </form.Field>
              <form.Field name="valueCm" validators={{ onChange: validatePositiveInteger }}>
                {(field) => (
                  <TextField
                    label="Значення, см"
                    type="number"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(Number(e.target.value))}
                    onBlur={field.handleBlur}
                    error={Boolean(field.state.meta.errors.length)}
                    helperText={field.state.meta.errors[0]}
                    fullWidth
                  />
                )}
              </form.Field>
              {addMutation.isError && (
                <Alert severity="error">
                  {toErrorMessage(addMutation.error, "Не вдалося додати")}
                </Alert>
              )}
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={closeDialog}>Скасувати</Button>
            <form.Subscribe selector={(state) => state.canSubmit}>
              {(canSubmit) => (
                <Button
                  type="submit"
                  variant="contained"
                  disabled={!canSubmit || addMutation.isPending}
                >
                  Додати
                </Button>
              )}
            </form.Subscribe>
          </DialogActions>
        </Box>
      </Dialog>
    </Paper>
  );
}
