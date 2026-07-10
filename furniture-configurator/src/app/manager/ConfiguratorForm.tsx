"use client";

import { useForm } from "@tanstack/react-form";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import FormControl from "@mui/material/FormControl";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormGroup from "@mui/material/FormGroup";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { toErrorMessage } from "@/lib/queries/fetchJson";
import { useSubmitConfigurationMutation } from "@/lib/queries/useConfigurations";
import { getExistingCatalogMatch, useSaveCatalogEntryMutation } from "@/lib/queries/useCatalogEntries";
import { validatePositiveInteger } from "@/lib/forms/validators";

interface DictionaryOption {
  id: number;
  name: string;
}

interface HardwareOption {
  id: number;
  name: string;
  sku: string;
}

interface ConfiguratorFormValues {
  topSizeCm: number;
  bottomSizeCm: number;
  facadeColorId: number;
  facadeMaterialId: number;
  corpusMaterialId: number;
  hardwareItemIds: number[];
}

export function ConfiguratorForm({
  productType,
  colors,
  materials,
  hardwareItems,
}: {
  productType: { id: number; name: string };
  colors: DictionaryOption[];
  materials: DictionaryOption[];
  hardwareItems: HardwareOption[];
}) {
  const submitMutation = useSubmitConfigurationMutation();
  const saveMutation = useSaveCatalogEntryMutation();

  const form = useForm({
    defaultValues: {
      topSizeCm: 60,
      bottomSizeCm: 60,
      facadeColorId: colors[0]?.id ?? 0,
      facadeMaterialId: materials[0]?.id ?? 0,
      corpusMaterialId: materials[0]?.id ?? 0,
      hardwareItemIds: [] as number[],
    } satisfies ConfiguratorFormValues,
    onSubmit: async ({ value }) => {
      saveMutation.reset();
      await submitMutation.mutateAsync({ ...value, productTypeId: productType.id });
    },
  });

  function handleSaveAsCatalogEntry() {
    saveMutation.mutate({ ...form.state.values, productTypeId: productType.id });
  }

  const result = submitMutation.data;
  const submitError = submitMutation.isError
    ? toErrorMessage(submitMutation.error, "Не вдалося сформувати BOM")
    : null;

  const existingMatch = saveMutation.isError ? getExistingCatalogMatch(saveMutation.error) : null;
  const saveMessage = saveMutation.isSuccess
    ? `Збережено як нову каталожну позицію: ${saveMutation.data.catalogEntry.sku}`
    : saveMutation.isError
      ? existingMatch
        ? `Ця комбінація вже є в каталозі: ${existingMatch.sku}`
        : toErrorMessage(saveMutation.error, "Не вдалося зберегти")
      : null;

  const errorsByPart = new Map<string, string>();
  if (result && !result.bomResult.valid) {
    for (const err of result.bomResult.errors) {
      errorsByPart.set(err.partRole, err.message);
    }
  }

  return (
    <Box sx={{ mt: 2 }}>
      <Paper
        component="form"
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit().catch(() => {});
        }}
        sx={{ p: 3 }}
      >
        <Typography variant="h6" component="h2" gutterBottom>
          {productType.name}
        </Typography>

        <Stack spacing={2}>
          <form.Field name="topSizeCm" validators={{ onChange: validatePositiveInteger }}>
            {(field) => (
              <TextField
                label="Верх, см"
                type="number"
                value={field.state.value}
                onChange={(e) => field.handleChange(Number(e.target.value))}
                onBlur={field.handleBlur}
                required
                error={Boolean(field.state.meta.errors.length) || Boolean(errorsByPart.get("TOP"))}
                helperText={field.state.meta.errors[0] ?? errorsByPart.get("TOP")}
              />
            )}
          </form.Field>

          <form.Field name="bottomSizeCm" validators={{ onChange: validatePositiveInteger }}>
            {(field) => (
              <TextField
                label="Низ, см"
                type="number"
                value={field.state.value}
                onChange={(e) => field.handleChange(Number(e.target.value))}
                onBlur={field.handleBlur}
                required
                error={
                  Boolean(field.state.meta.errors.length) || Boolean(errorsByPart.get("BOTTOM"))
                }
                helperText={field.state.meta.errors[0] ?? errorsByPart.get("BOTTOM")}
              />
            )}
          </form.Field>

          <form.Field name="facadeColorId">
            {(field) => (
              <FormControl fullWidth>
                <InputLabel id="facade-color-label">Колір фасаду</InputLabel>
                <Select
                  labelId="facade-color-label"
                  label="Колір фасаду"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(Number(e.target.value))}
                >
                  {colors.map((c) => (
                    <MenuItem key={c.id} value={c.id}>
                      {c.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
          </form.Field>

          <form.Field name="facadeMaterialId">
            {(field) => (
              <FormControl fullWidth>
                <InputLabel id="facade-material-label">Матеріал фасаду</InputLabel>
                <Select
                  labelId="facade-material-label"
                  label="Матеріал фасаду"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(Number(e.target.value))}
                >
                  {materials.map((m) => (
                    <MenuItem key={m.id} value={m.id}>
                      {m.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
          </form.Field>

          <form.Field name="corpusMaterialId">
            {(field) => (
              <FormControl fullWidth>
                <InputLabel id="corpus-material-label">Матеріал корпусу</InputLabel>
                <Select
                  labelId="corpus-material-label"
                  label="Матеріал корпусу"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(Number(e.target.value))}
                >
                  {materials.map((m) => (
                    <MenuItem key={m.id} value={m.id}>
                      {m.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
          </form.Field>

          <form.Field name="hardwareItemIds">
            {(field) => (
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Фурнітура
                </Typography>
                <FormGroup>
                  {hardwareItems.map((h) => (
                    <FormControlLabel
                      key={h.id}
                      control={
                        <Checkbox
                          checked={field.state.value.includes(h.id)}
                          onChange={() => {
                            const next = field.state.value.includes(h.id)
                              ? field.state.value.filter((id) => id !== h.id)
                              : [...field.state.value, h.id];
                            field.handleChange(next);
                          }}
                        />
                      }
                      label={`${h.name} (${h.sku})`}
                    />
                  ))}
                </FormGroup>
              </Box>
            )}
          </form.Field>

          <form.Subscribe selector={(state) => state.canSubmit}>
            {(canSubmit) => (
              <Button
                type="submit"
                variant="contained"
                disabled={!canSubmit || submitMutation.isPending}
              >
                {submitMutation.isPending ? "Формування..." : "Сформувати BOM"}
              </Button>
            )}
          </form.Subscribe>
        </Stack>
      </Paper>

      {submitError && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {submitError}
        </Alert>
      )}

      {result && (
        <Paper sx={{ p: 3, mt: 2 }}>
          {result.bomResult.valid ? (
            <Stack spacing={1}>
              <Typography>
                {result.isStandard
                  ? `Стандартна партія (${result.matchingEntry?.sku})`
                  : "Індивідуальна комбінація (ще немає в каталозі)"}
              </Typography>
              <Box component="ul" sx={{ pl: 3, m: 0 }}>
                {result.bomResult.bom.map((c) => (
                  <Typography component="li" key={`${c.partRole}-${c.sku}`}>
                    {c.label} — <code>{c.sku}</code>
                  </Typography>
                ))}
              </Box>
              {!result.isStandard && (
                <Button
                  onClick={handleSaveAsCatalogEntry}
                  variant="outlined"
                  disabled={saveMutation.isPending}
                  sx={{ alignSelf: "flex-start" }}
                >
                  {saveMutation.isPending ? "Збереження..." : "Зберегти як нову каталожну позицію"}
                </Button>
              )}
              {saveMessage && <Alert severity="info">{saveMessage}</Alert>}
            </Stack>
          ) : (
            <Typography>Виправте помилки вище, щоб сформувати BOM.</Typography>
          )}
        </Paper>
      )}
    </Box>
  );
}
