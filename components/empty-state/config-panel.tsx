import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RouteConfigForm } from "@/components/route-input/route-config-form";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type ConfigPanelProps = {
  className?: string;
  /** Stretch to fill a results-layout column; default is content-sized for empty state. */
  fillHeight?: boolean;
};

export function ConfigPanel({ className, fillHeight = false }: ConfigPanelProps) {
  return (
    <Card
      className={cn(
        "flex w-full flex-col overflow-visible rounded-lg",
        fillHeight ? "h-full lg:max-w-none" : "h-auto max-w-lg",
        className,
      )}
    >
      <CardHeader>
        <CardTitle className="text-xl font-semibold leading-tight">
          {t("empty.heading")}
        </CardTitle>
        <CardDescription>{t("empty.helper")}</CardDescription>
      </CardHeader>
      <CardContent
        className={cn(
          "overflow-visible",
          fillHeight && "flex min-h-0 flex-1 flex-col",
        )}
      >
        <RouteConfigForm />
      </CardContent>
    </Card>
  );
}
