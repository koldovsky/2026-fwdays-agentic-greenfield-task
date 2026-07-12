"use client";

import { MenuIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { navItems } from "@/components/layout/nav-items";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export function MobileNav() {
  const pathname = usePathname();

  return (
    <Sheet>
      <SheetTrigger
        aria-label="Open navigation"
        render={<Button className="md:hidden" size="icon-lg" variant="ghost" />}
      >
        <MenuIcon />
      </SheetTrigger>
      <SheetContent className="w-64 gap-0 bg-wf-surface" side="left">
        <SheetHeader className="border-b border-wf-border px-4 py-5">
          <SheetTitle className="font-semibold tracking-tight">
            Invoice Maker
          </SheetTitle>
        </SheetHeader>
        <nav className="flex flex-1 flex-col gap-0.5 p-3">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <SheetClose
                className={`rounded-lg px-3 py-2 text-left text-[13px] font-medium tracking-tight transition-colors ${
                  isActive
                    ? "bg-wf-surface-3 text-foreground shadow-wf-sm"
                    : "text-wf-text-2 hover:bg-wf-surface-2 hover:text-foreground"
                }`}
                key={item.href}
                nativeButton={false}
                render={<Link href={item.href} />}
              >
                {item.label}
              </SheetClose>
            );
          })}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
