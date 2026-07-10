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
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { toErrorMessage } from "@/lib/queries/fetchJson";
import {
  useAddSimpleDictionaryItemMutation,
  useSimpleDictionaryQuery,
  useToggleSimpleDictionaryActiveMutation,
  type SimpleDictionaryEntry,
} from "@/lib/queries/useSimpleDictionary";

export function SimpleDictionarySection({
  title,
  resourcePath,
  listKey,
  itemKey,
  initialItems,
}: {
  title: string;
  resourcePath: string;
  listKey: string;
  itemKey: string;
  initialItems: SimpleDictionaryEntry[];
}) {
  const { data: items } = useSimpleDictionaryQuery(resourcePath, listKey, initialItems);
  const addMutation = useAddSimpleDictionaryItemMutation(resourcePath, itemKey);
  const toggleMutation = useToggleSimpleDictionaryActiveMutation(resourcePath, itemKey);
  const [dialogOpen, setDialogOpen] = useState(false);

  const form = useForm({
    defaultValues: { name: "" },
    onSubmit: async ({ value }) => {
      await addMutation.mutateAsync(value.name.trim());
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
          {title}
        </Typography>
        <Button variant="contained" size="small" onClick={() => setDialogOpen(true)}>
          Додати
        </Button>
      </Stack>

      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Назва</TableCell>
            <TableCell>Статус</TableCell>
            <TableCell align="right">Дія</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell>{item.name}</TableCell>
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
          <DialogTitle>Додати: {title}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <form.Field
                name="name"
                validators={{
                  onChange: ({ value }) => (value.trim() ? undefined : "Назва обов'язкова"),
                }}
              >
                {(field) => (
                  <TextField
                    autoFocus
                    label="Нова назва"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
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
