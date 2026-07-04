import Link from "next/link";
import { Button } from "@notely-design/components";
import {
  IconArchive,
  IconInbox,
  IconPin,
  IconSettings,
  IconStar,
  IconTrash,
} from "@/components/icons";

const pageIcons = {
  inbox: IconInbox,
  star: IconStar,
  pin: IconPin,
  archive: IconArchive,
  "trash-2": IconTrash,
  settings: IconSettings,
} as const;

type PageIconName = keyof typeof pageIcons;

type PlaceholderPageProps = {
  title: string;
  description: string;
  icon?: PageIconName;
  action?: {
    label: string;
    href: string;
  };
};

export function PlaceholderPage({
  title,
  description,
  icon = "inbox",
  action,
}: PlaceholderPageProps) {
  const Icon = pageIcons[icon];

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-16">
      <h1 className="t-h2 mb-8" style={{ color: "var(--color-text)" }}>
        {title}
      </h1>
      <div
        className="mx-auto flex max-w-[360px] flex-col items-center px-6 py-12 text-center"
      >
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
          {description}
        </p>
        <p
          className="mt-1.5 text-sm leading-normal"
          style={{ color: "var(--color-text-secondary)" }}
        >
          Notes you add here will show up in this view.
        </p>
        {action && (
          <div className="mt-5">
            <Link href={action.href}>
              <Button variant="primary">{action.label}</Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
