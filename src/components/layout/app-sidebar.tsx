"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navItems } from "@/components/layout/nav-items";

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-56 flex-col border-r border-wf-border bg-wf-surface text-foreground md:flex">
      <div className="border-b border-wf-border px-4 py-5">
        <Link
          href="/dashboard"
          className="flex items-center gap-2.25 font-semibold tracking-tight"
        >
          <span className="flex size-[26px] items-center justify-center rounded-[7px] bg-wf-text text-xs font-bold text-white">
            I
          </span>
          <span className="text-base">Invoice Maker</span>
        </Link>
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 p-3">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-lg px-3 py-2 text-[13px] font-medium tracking-tight transition-colors ${
                isActive
                  ? "bg-wf-surface-3 text-foreground shadow-wf-sm"
                  : "text-wf-text-2 hover:bg-wf-surface-2 hover:text-foreground"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
