import { redirect } from "next/navigation";

/**
 * The application root redirects to the cabinet home (FR-SHELL-01). The proxy
 * guard ensures an unauthenticated visitor is sent to sign-in first; an
 * authenticated one lands on `/cycles`.
 */
export default function Home() {
  redirect("/cycles");
}
