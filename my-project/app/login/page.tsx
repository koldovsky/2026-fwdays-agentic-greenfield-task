import { getSession } from "@/lib/auth/session";
import { loginAction } from "@/lib/actions";
import { redirect } from "next/navigation";

export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await getSession()) redirect("/dashboard");
  const { error } = await searchParams;
  return <main className="login-page"><section className="login-card"><div className="brand-mark">FF</div><p className="eyebrow">Manufacturing operations</p><h1>Welcome to ForgeFlow</h1><p className="muted">Procurement, inventory, and production in one clear workspace.</p>{error && <div className="notice error" role="alert">{error}</div>}<form action={loginAction} className="stack"><label>Username<input name="username" defaultValue="test" autoComplete="username" required /></label><label>Password<input name="password" type="password" defaultValue="test" autoComplete="current-password" required /></label><button className="button primary" type="submit">Sign in securely</button></form><p className="demo-note">Demo access: <code>test</code> / <code>test</code></p></section></main>;
}

