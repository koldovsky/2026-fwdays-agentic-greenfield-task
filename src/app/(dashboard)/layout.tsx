import Link from "next/link";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-full flex-1">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center gap-2 border-b border-wf-border bg-wf-surface/80 px-4 backdrop-blur-md md:px-6">
          <MobileNav />
          <Link
            className="flex items-center gap-2 font-semibold tracking-tight md:hidden"
            href="/dashboard"
          >
            <span className="flex size-[26px] items-center justify-center rounded-[7px] bg-wf-text text-xs font-bold text-white">
              I
            </span>
            <span className="text-base">Invoice Maker</span>
          </Link>
          <p className="truncate text-[13px] font-medium text-wf-text-2">
            Workspace overview
          </p>
        </header>
        <main className="flex-1 bg-wf-bg p-6">{children}</main>
      </div>
    </div>
  );
}
