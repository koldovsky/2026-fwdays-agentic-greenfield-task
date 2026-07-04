import { AdminPanel } from "@/components/admin/admin-panel";
import { SiteHeaderWithAuth } from "@/components/shell/site-header-auth";

export default function AdminPage() {
  return (
    <>
      <SiteHeaderWithAuth active="admin" />
      <main className="mx-auto max-w-3xl flex-1 px-4 py-10 sm:px-6">
        <h1 className="text-3xl font-bold text-emerald-950">User management</h1>
        <p className="mt-2 text-sm text-zinc-600">Admin only — add accounts for household members.</p>
        <AdminPanel />
      </main>
    </>
  );
}
