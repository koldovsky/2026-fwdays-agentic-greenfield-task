"use client";

import Link from "next/link";
import type { Folder, Tag } from "@prisma/client";
import { Button } from "@notely-design/components";
import { bottomNavItems, primaryNavItems } from "@/lib/nav-items";
import { navIconMap, IconPlus } from "@/app/components/icons";
import { SidebarNavLink, SidebarSection } from "@/app/components/layout/sidebar-nav";
import { SidebarFolderRow } from "@/app/components/layout/sidebar-folder-row";
import { SidebarTagRow } from "@/app/components/layout/sidebar-tag-row";
import { SidebarCreateRow } from "@/app/components/layout/sidebar-create-row";
import { createFolder } from "@/app/actions/folders";
import { createTag } from "@/app/actions/tags";

type SidebarProps = {
  collapsed: boolean;
  mobile?: boolean;
  onNavigate?: () => void;
  folders: Folder[];
  tags: Tag[];
};

export function Sidebar({
  collapsed,
  mobile = false,
  onNavigate,
  folders,
  tags,
}: SidebarProps) {
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
        {folders.map((folder) => (
          <SidebarFolderRow
            key={folder.id}
            id={folder.id}
            name={folder.name}
            collapsed={!showLabels}
          />
        ))}
        <SidebarCreateRow
          label="New folder"
          collapsed={!showLabels}
          onCreate={createFolder}
        />
      </SidebarSection>

      <SidebarSection label="Tags" collapsed={!showLabels}>
        {tags.map((tag) => (
          <SidebarTagRow
            key={tag.id}
            id={tag.id}
            name={tag.name}
            collapsed={!showLabels}
          />
        ))}
        <SidebarCreateRow label="New tag" collapsed={!showLabels} onCreate={createTag} />
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
