import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";

type AppShellProps = {
  children: React.ReactNode;
  headerSlot?: React.ReactNode;
};

export function AppShell({ children, headerSlot }: AppShellProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col lg:overflow-hidden">
      <SiteHeader>{headerSlot}</SiteHeader>
      <main className="flex min-h-0 w-full flex-1 flex-col p-4 xl:p-6 lg:overflow-hidden">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
