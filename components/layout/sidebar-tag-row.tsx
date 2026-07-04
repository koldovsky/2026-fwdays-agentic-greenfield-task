"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Input, IconButton } from "@notely-design/components";
import { IconTrash, IconPencil } from "@/components/icons";
import { renameTag, deleteTag } from "@/app/actions/tags";

type SidebarTagRowProps = {
  id: string;
  name: string;
  collapsed?: boolean;
};

export function SidebarTagRow({ id, name, collapsed = false }: SidebarTagRowProps) {
  const pathname = usePathname();
  const active = pathname === `/tags/${id}`;
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
            await renameTag(id, trimmed);
          }
          setEditing(false);
        }}
      >
        <Input
          autoFocus
          aria-label="Tag name"
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
        href={`/tags/${id}`}
        className="flex min-w-0 flex-1 items-center gap-2 px-2.5 py-[7px] text-sm no-underline"
        style={{
          color: active ? "var(--color-primary)" : "var(--color-text-secondary)",
        }}
      >
        <span className="shrink-0" style={{ color: "var(--color-text-tertiary)" }}>
          #
        </span>
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
              if (window.confirm(`Delete tag "${name}"? Notes keep their content.`)) {
                void deleteTag(id);
              }
            }}
          />
        </div>
      )}
    </div>
  );
}
