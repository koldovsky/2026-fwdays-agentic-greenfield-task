import { cn } from "@/lib/utils";

export function AppLogo({
  className,
  title: _title = "Email Shadow Panel",
}: {
  className?: string;
  title?: string;
}) {
  return (
    <img
      src="/brand/email-shadow-panel-mark.svg"
      alt=""
      aria-hidden="true"
      className={cn("size-8 select-none", className)}
      draggable={false}
    />
  );
}

export function MailProviderIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      className={cn("size-6", className)}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3.5" y="5.5" width="17" height="13" rx="2.8" />
      <path d="m4.7 7.3 6.35 5.25a1.55 1.55 0 0 0 1.9 0L19.3 7.3" />
      <path d="M18.8 17.7 14 13.9" opacity="0.65" />
    </svg>
  );
}
