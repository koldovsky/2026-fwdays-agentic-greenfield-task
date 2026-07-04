import { ThemeToggle } from "@/components/theme/theme-toggle";
import { t } from "@/lib/i18n";

type SiteHeaderProps = {
  children?: React.ReactNode;
};

export function SiteHeader({ children }: SiteHeaderProps) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4 xl:px-6">
      <span className="text-lg font-semibold leading-tight">
        {t("shell.title")}
      </span>
      <div className="flex items-center gap-2">
        {children}
        <ThemeToggle />
      </div>
    </header>
  );
}
