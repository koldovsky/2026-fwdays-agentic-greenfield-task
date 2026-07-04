import { AppShell } from "@/components/layout/app-shell";
import { verifySession } from "@/app/lib/dal";
import { listFolders } from "@/lib/folders/queries";
import { listTags } from "@/lib/tags/queries";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await verifySession();
  const [folders, tags] = await Promise.all([
    listFolders(userId),
    listTags(userId),
  ]);

  return (
    <AppShell folders={folders} tags={tags}>
      {children}
    </AppShell>
  );
}
