"use client";

import { IconButton } from "@notely-design/components";
import {
  IconHeading1,
  IconHeading2,
  IconListBullet,
  IconListOrdered,
  IconListChecks,
  IconCode,
} from "@/app/components/icons";

export type ToolbarAction =
  | "heading-1"
  | "heading-2"
  | "list-bullet"
  | "list-ordered"
  | "list-checks"
  | "code";

const actions: { action: ToolbarAction; icon: typeof IconHeading1; label: string }[] = [
  { action: "heading-1", icon: IconHeading1, label: "Heading 1 (Ctrl+Alt+1)" },
  { action: "heading-2", icon: IconHeading2, label: "Heading 2 (Ctrl+Alt+2)" },
  { action: "list-bullet", icon: IconListBullet, label: "Bullet list (Ctrl+Shift+8)" },
  { action: "list-ordered", icon: IconListOrdered, label: "Numbered list (Ctrl+Shift+7)" },
  { action: "list-checks", icon: IconListChecks, label: "Checklist (Ctrl+Shift+9)" },
  { action: "code", icon: IconCode, label: "Code (Ctrl+E)" },
];

type EditorToolbarProps = {
  onAction: (action: ToolbarAction) => void;
};

export function EditorToolbar({ onAction }: EditorToolbarProps) {
  return (
    <div
      role="toolbar"
      aria-label="Formatting"
      className="flex items-center gap-0.5 rounded-[var(--radius-lg)] border p-1"
      style={{
        background: "var(--color-card)",
        borderColor: "var(--color-border)",
      }}
    >
      {actions.map(({ action, icon: Icon, label }) => (
        <IconButton
          key={action}
          icon={<Icon width={17} height={17} />}
          label={label}
          variant="ghost"
          size="sm"
          onClick={() => onAction(action)}
        />
      ))}
    </div>
  );
}
