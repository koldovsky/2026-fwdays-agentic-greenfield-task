import { getSession } from "@/lib/auth/session";
import { loginAction } from "@/lib/actions";
import { redirect } from "next/navigation";

export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await getSession()) redirect("/dashboard");
  const { error } = await searchParams;
  return <main className="login-page"><section className="login-card"><div className="brand-mark">FF</div><p className="eyebrow">Виробничі операції</p><h1>Вітаємо у ForgeFlow</h1><p className="muted">Закупівлі, запаси та виробництво в одному зрозумілому робочому просторі.</p>{error && <div className="notice error" role="alert">{error}</div>}<form action={loginAction} className="stack"><label>Ім’я користувача<input name="username" defaultValue="test" autoComplete="username" required /></label><label>Пароль<input name="password" type="password" defaultValue="test" autoComplete="current-password" required /></label><button className="button primary" type="submit">Увійти безпечно</button></form><p className="demo-note">Демо-доступ: <code>test</code> / <code>test</code></p></section></main>;
}
