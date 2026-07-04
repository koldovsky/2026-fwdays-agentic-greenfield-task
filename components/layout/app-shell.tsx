"use client";

import {
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Folder, Tag } from "@prisma/client";
import { IconButton } from "@notely-design/components";
import {
  readSidebarCollapsed,
  writeSidebarCollapsed,
} from "@/lib/storage";
import { Sidebar } from "@/components/layout/sidebar";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { LogoutButton } from "@/components/layout/logout-button";
import {
  IconMenu,
  IconPanelLeftClose,
  IconPanelLeftOpen,
} from "@/components/icons";

type AppShellProps = {
  children: ReactNode;
  folders: Folder[];
  tags: Tag[];
};

export function AppShell({ children, folders, tags }: AppShellProps) {
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return readSidebarCollapsed();
  });
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!mobileOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      writeSidebarCollapsed(next);
      return next;
    });
  }, []);

  const closeMobile = useCallback(() => {
    setMobileOpen(false);
  }, []);

  return (
    <div className="flex h-dvh overflow-hidden bg-[var(--color-bg)]">
      {/* Desktop / tablet sidebar */}
      <div className="hidden md:flex md:shrink-0">
        <Sidebar collapsed={collapsed} folders={folders} tags={tags} />
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden" role="presentation">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close navigation"
            onClick={closeMobile}
          />
          <div
            className="absolute inset-y-0 left-0 z-50 shadow-lg"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
          >
            <Sidebar
              collapsed={false}
              mobile
              onNavigate={closeMobile}
              folders={folders}
              tags={tags}
            />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header
          className="flex shrink-0 items-center gap-2 border-b px-3 py-2 md:px-4"
          style={{
            borderColor: "var(--color-border)",
            background: "var(--color-surface)",
          }}
        >
          <div className="md:hidden">
            <IconButton
              icon={<IconMenu />}
              label="Open navigation"
              variant="ghost"
              onClick={() => setMobileOpen(true)}
            />
          </div>
          <div className="hidden md:contents">
            <IconButton
              icon={collapsed ? <IconPanelLeftOpen /> : <IconPanelLeftClose />}
              label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              variant="ghost"
              onClick={toggleCollapsed}
            />
          </div>
          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />
            <LogoutButton />
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
