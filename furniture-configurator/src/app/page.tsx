import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE } from "@/lib/auth";

export default async function Home() {
  const role = (await cookies()).get(SESSION_COOKIE)?.value;

  if (role === "manager") redirect("/manager");
  if (role === "admin") redirect("/admin");
  redirect("/login");
}
