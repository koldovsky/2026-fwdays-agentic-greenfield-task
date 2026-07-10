import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { login } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <Container maxWidth="xs" sx={{ mt: 8 }}>
      <Paper elevation={2} sx={{ p: 4 }}>
        <Typography variant="h5" component="h1" gutterBottom>
          Furniture Configurator
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Демо-вхід: <code>manager</code> / <code>manager123</code> (менеджер) або{" "}
          <code>admin</code> / <code>admin123</code> (адмін).
        </Typography>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            Невірний логін або пароль.
          </Alert>
        )}
        <Box component="form" action={login}>
          <Stack spacing={2}>
            <TextField name="username" label="Логін" required fullWidth autoFocus />
            <TextField name="password" label="Пароль" type="password" required fullWidth />
            <Button type="submit" variant="contained">
              Увійти
            </Button>
          </Stack>
        </Box>
      </Paper>
    </Container>
  );
}
