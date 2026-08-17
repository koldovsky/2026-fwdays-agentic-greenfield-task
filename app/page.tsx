import { redirect } from "next/navigation";
import { createSession } from "@/lib/document-session";

export default async function Home() {
  const session = await createSession();
  redirect(`/docs/${session.guid}`);
}
