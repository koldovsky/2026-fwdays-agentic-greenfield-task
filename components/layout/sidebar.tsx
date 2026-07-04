"use client";

import Link from "next/link";
import { Button } from "@notely-design/components";
import {
  bottomNavItems,
  placeholderFolders,
  placeholderTags,
  primaryNavItems,
} from "@/lib/nav-items";
import { navIconMap, IconFolder, IconPlus } from "@/components/icons";
import {
  SidebarNavLink,
  SidebarPlaceholderRow,
  SidebarSection,
} from "@/components/layout/sidebar-nav";

type SidebarProps = {
  collapsed: boolean;
  mobile?: boolean;
  onNavigate?: () => void;
};

export function Sidebar({ collapsed, mobile = false, onNavigate }: SidebarProps) {
  const showLabels = mobile || !collapsed;

  return (
    <aside
      className="box-border flex h-full flex-col shrink-0 border-r p-3"
      style={{
        width: mobile ? 244 : collapsed ? 56 : 244,
        background: "var(--color-surface)",
        borderColor: "var(--color-border)",
      }}
      aria-label="Main navigation"
    >
      <div
        className="flex items-center gap-2 px-2 pb-3.5 pt-1"
        style={{ justifyContent: showLabels ? "flex-start" : "center" }}
      >
        <span
          className="inline-flex size-[26px] shrink-0 items-center justify-center rounded-lg text-[15px] font-bold text-white"
          style={{ background: "var(--color-primary)" }}
          aria-hidden
        >
          N
        </span>
        {showLabels && (
          <span
            className="text-base font-bold tracking-tight"
            style={{ color: "var(--color-text)" }}
          >
            Notely
          </span>
        )}
      </div>

      <Link href="/notes/new" onClick={onNavigate} className="block">
        <Button
          variant="primary"
          fullWidth
          leadingIcon={<IconPlus width={16} height={16} />}
          style={showLabels ? undefined : { padding: "0 10px", minWidth: 44 }}
        >
          {showLabels ? "New note" : ""}
        </Button>
      </Link>

      <nav className="mt-4 flex flex-col gap-px" aria-label="Notes">
        {primaryNavItems.map((item) => {
          const Icon = navIconMap[item.icon as keyof typeof navIconMap];
          return (
            <SidebarNavLink
              key={item.id}
              href={item.href}
              label={item.label}
              icon={<Icon />}
              collapsed={!showLabels}
              onNavigate={onNavigate}
            />
          );
        })}
      </nav>

      <SidebarSection label="Folders" collapsed={!showLabels}>
        {placeholderFolders.map((folder) => (
          <SidebarPlaceholderRow
            key={folder.name}
            label={folder.name}
            color={folder.color}
            collapsed={!showLabels}
          />
        ))}
        <SidebarPlaceholderRow
          label="New folder"
          icon={<IconFolder />}
          collapsed={!showLabels}
        />
      </SidebarSection>

      <SidebarSection label="Tags" collapsed={!showLabels}>
        {placeholderTags.map((tag) => (
          <SidebarPlaceholderRow
            key={tag}
            label={tag}
            icon={
              <span style={{ color: "var(--color-text-tertiary)" }}>#</span>
            }
            collapsed={!showLabels}
          />
        ))}
      </SidebarSection>

      <div className="mt-auto pt-3">
        {bottomNavItems.map((item) => {
          const Icon = navIconMap[item.icon as keyof typeof navIconMap];
          return (
            <SidebarNavLink
              key={item.id}
              href={item.href}
              label={item.label}
              icon={<Icon />}
              collapsed={!showLabels}
              onNavigate={onNavigate}
            />
          );
        })}
      </div>
    </aside>
  );
}
