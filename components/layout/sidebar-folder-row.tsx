"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Input, IconButton } from "@notely-design/components";
import { IconFolder, IconTrash, IconPencil } from "@/components/icons";
import { renameFolder, deleteFolder } from "@/app/actions/folders";

type SidebarFolderRowProps = {
  id: string;
  name: string;
  collapsed?: boolean;
};

export function SidebarFolderRow({
  id,
  name,
  collapsed = false,
}: SidebarFolderRowProps) {
  const pathname = usePathname();
  const active = pathname === `/folders/${id}`;
  const [hover, setHover] = useState(false);
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);

  if (collapsed) return null;

  if (editing) {
    return (
      <form
        className="px-2.5 py-1"
        action={async () => {
          const trimmed = value.trim();
          if (trimmed && trimmed !== name) {
            await renameFolder(id, trimmed);
          }
          setEditing(false);
        }}
      >
        <Input
          autoFocus
          aria-label="Folder name"
          size="sm"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onBlur={(event) => event.currentTarget.form?.requestSubmit()}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setValue(name);
              setEditing(false);
            }
          }}
        />
      </form>
    );
  }

  return (
    <div
      className="group flex items-center gap-1 rounded-[var(--radius-md)]"
      style={{
        background: active
          ? "var(--color-selected)"
          : hover
            ? "var(--color-hover)"
            : "transparent",
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <Link
        href={`/folders/${id}`}
        className="flex min-w-0 flex-1 items-center gap-2 px-2.5 py-[7px] text-sm no-underline"
        style={{
          color: active ? "var(--color-primary)" : "var(--color-text-secondary)",
        }}
      >
        <IconFolder className="shrink-0" />
        <span
          className="min-w-0 flex-1 truncate"
          style={{
            fontWeight: active ? "var(--fw-semibold)" : "var(--fw-medium)",
            color: active ? "var(--color-text)" : "inherit",
          }}
        >
          {name}
        </span>
      </Link>
      {hover && (
        <div className="flex shrink-0 items-center gap-0.5 pr-1.5">
          <IconButton
            icon={<IconPencil width={13} height={13} />}
            label={`Rename ${name}`}
            variant="ghost"
            size="sm"
            onClick={() => setEditing(true)}
          />
          <IconButton
            icon={<IconTrash width={13} height={13} />}
            label={`Delete ${name}`}
            variant="ghost"
            size="sm"
            onClick={() => {
              if (window.confirm(`Delete folder "${name}"? Notes inside it are kept.`)) {
                void deleteFolder(id);
              }
            }}
          />
        </div>
      )}
    </div>
  );
}
