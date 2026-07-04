import Link from "next/link";
import { Button } from "@notely-design/components";
import { IconInbox, IconTrash, IconSearch } from "@/components/icons";

const icons = {
  inbox: IconInbox,
  "trash-2": IconTrash,
  search: IconSearch,
} as const;

type NoteEmptyStateAction =
  | { label: string; href: string }
  | { label: string; formAction: () => Promise<void> };

type NoteEmptyStateProps = {
  icon: keyof typeof icons;
  title: string;
  description: string;
  action?: NoteEmptyStateAction;
};

export function NoteEmptyState({
  icon,
  title,
  description,
  action,
}: NoteEmptyStateProps) {
  const Icon = icons[icon];

  return (
    <div className="mx-auto flex max-w-[360px] flex-col items-center px-6 py-16 text-center">
      <span
        className="mb-4 inline-flex size-14 items-center justify-center rounded-[var(--radius-xl)]"
        style={{
          background: "var(--color-primary-subtle)",
          color: "var(--color-primary)",
        }}
      >
        <Icon width={28} height={28} />
      </span>
      <p
        className="text-base font-semibold"
        style={{ color: "var(--color-text)" }}
      >
        {title}
      </p>
      <p
        className="mt-1.5 text-sm leading-normal"
        style={{ color: "var(--color-text-secondary)" }}
      >
        {description}
      </p>
      {action && "href" in action && (
        <div className="mt-5">
          <Link href={action.href}>
            <Button variant="primary">{action.label}</Button>
          </Link>
        </div>
      )}
      {action && "formAction" in action && (
        <form action={action.formAction} className="mt-5">
          <Button type="submit" variant="primary">
            {action.label}
          </Button>
        </form>
      )}
    </div>
  );
}
