import { Badge } from "@/components/ui/badge";
import {
  INVOICE_STATUS_BADGE_VARIANT,
  INVOICE_STATUS_DOT_COLOR,
  INVOICE_STATUS_LABELS,
} from "@/lib/design-system";
import type { InvoiceDisplayStatus } from "@/types/invoice";
import { cn } from "@/lib/utils";

type InvoiceStatusBadgeProps = {
  status: InvoiceDisplayStatus;
  className?: string;
};

export function InvoiceStatusBadge({ status, className }: InvoiceStatusBadgeProps) {
  return (
    <Badge
      variant={INVOICE_STATUS_BADGE_VARIANT[status]}
      className={cn("gap-1.25", className)}
    >
      <span
        className={cn("size-1.5 rounded-full", INVOICE_STATUS_DOT_COLOR[status])}
        aria-hidden
      />
      {INVOICE_STATUS_LABELS[status]}
    </Badge>
  );
}
