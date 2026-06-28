import type { ReactNode } from "react";
import { Sidebar } from "@/components/shell/Sidebar";
import { getCurrentHrUser } from "./current-user";

/**
 * The HR workspace shell (FR-SHELL-01). A Server Component: the proxy guard
 * guarantees the visitor is authenticated before this renders, so the current
 * user is read server-side for the sidebar. Layout is a fixed sidebar plus a
 * scrollable content area; each screen renders its own sticky `PageHeader`.
 */
export default async function CabinetLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentHrUser();

  return (
    <div className="flex h-dvh w-full overflow-hidden">
      <Sidebar user={user} />
      <main className="flex min-w-0 flex-1 flex-col overflow-y-auto">{children}</main>
    </div>
  );
}
