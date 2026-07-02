import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
export default async function Home() { redirect((await getSession()) ? "/dashboard" : "/login"); }

