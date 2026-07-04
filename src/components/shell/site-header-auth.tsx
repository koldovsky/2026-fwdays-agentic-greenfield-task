import { getSessionUser } from "@/lib/auth/session-server";
import { SiteHeader } from "@/components/shell/site-header";

type SiteHeaderAuthProps = {
  active?: "home" | "book" | "bookings" | "scheduled" | "admin";
  user: { username: string; role: "user" | "admin" } | null;
};

export async function SiteHeaderWithAuth({
  active = "home",
}: {
  active?: "home" | "book" | "bookings" | "scheduled" | "admin";
}) {
  const user = await getSessionUser();
  return <SiteHeader active={active} user={user} />;
}

export type { SiteHeaderAuthProps };
