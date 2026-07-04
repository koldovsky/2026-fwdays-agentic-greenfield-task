"use client";

import { useState } from "react";
import { Input } from "@notely-design/components";
import { IconPlus } from "@/components/icons";

type SidebarCreateRowProps = {
  label: string;
  collapsed?: boolean;
  onCreate: (name: string) => Promise<unknown>;
};

export function SidebarCreateRow({
  label,
  collapsed = false,
  onCreate,
}: SidebarCreateRowProps) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");

  if (collapsed) return null;

  if (editing) {
    return (
      <form
        className="px-2.5 py-1"
        action={async () => {
          const trimmed = value.trim();
          setEditing(false);
          setValue("");
          if (trimmed) {
            await onCreate(trimmed);
          }
        }}
      >
        <Input
          autoFocus
          aria-label={label}
          size="sm"
          value={value}
          placeholder={label}
          onChange={(event) => setValue(event.target.value)}
          onBlur={(event) => event.currentTarget.form?.requestSubmit()}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setValue("");
              setEditing(false);
            }
          }}
        />
      </form>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="flex w-full items-center gap-2 rounded-[var(--radius-md)] border-none bg-transparent px-2.5 py-[7px] text-left text-sm"
      style={{ color: "var(--color-text-tertiary)" }}
    >
      <IconPlus width={14} height={14} />
      <span>{label}</span>
    </button>
  );
}
