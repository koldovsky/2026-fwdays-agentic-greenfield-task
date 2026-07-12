# WEG3D Fin — Component patterns

Concrete patterns for Invoice Maker UI. Adapt copy; keep token/class conventions.

## Page shell

```tsx
export function PageShell({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6">
      <header className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="wf-display">{title}</h1>
          {description ? (
            <p className="text-sm text-wf-text-2">{description}</p>
          ) : null}
        </div>
        {action}
      </header>
      {children}
    </div>
  );
}
```

## Form field

```tsx
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function FormField({
  id,
  label,
  ...inputProps
}: React.ComponentProps<typeof Input> & { label: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} className="wf-label">
        {label}
      </Label>
      <Input id={id} className="h-9" {...inputProps} />
    </div>
  );
}
```

## Card section

```tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function SettingsSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="wf-h2">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}
```

## Invoice list row

```tsx
import { InvoiceStatusBadge } from "@/components/invoices/invoice-status-badge";
import type { InvoiceDisplayStatus } from "@/types/invoice";

export function InvoiceRow({
  number,
  client,
  amount,
  status,
}: {
  number: string;
  client: string;
  amount: string;
  status: InvoiceDisplayStatus;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-wf-border px-4 py-3">
      <div className="min-w-0">
        <p className="truncate font-medium text-wf-text">{client}</p>
        <p className="wf-mono text-sm text-wf-text-2">{number}</p>
      </div>
      <div className="flex shrink-0 items-center gap-4">
        <span className="wf-mono text-wf-text">{amount}</span>
        <InvoiceStatusBadge status={status} />
      </div>
    </div>
  );
}
```

## Invoice preview document

```tsx
export function InvoiceDocument({ children }: { children: React.ReactNode }) {
  return (
    <article className="wf-doc mx-auto max-w-[210mm] p-10 text-wf-text">
      {children}
    </article>
  );
}

export function InvoicePanel({ children }: { children: React.ReactNode }) {
  return <section className="wf-panel p-6">{children}</section>;
}
```

## Action bar

```tsx
import { Button } from "@/components/ui/button";

export function FormActions({
  onCancel,
  submitLabel = "Зберегти",
}: {
  onCancel: () => void;
  submitLabel?: string;
}) {
  return (
    <div className="flex justify-end gap-2">
      <Button type="button" variant="outline" className="h-9" onClick={onCancel}>
        Скасувати
      </Button>
      <Button type="submit" className="h-9">
        {submitLabel}
      </Button>
    </div>
  );
}
```

## Anti-patterns

```tsx
// ❌ Hardcoded hex
<div className="text-[#ef4136]">…</div>

// ✅ Token
<div className="text-primary">…</div>

// ❌ Custom status badge
<Badge className="bg-green-100 text-green-700">Оплачено</Badge>

// ✅ Domain component
<InvoiceStatusBadge status="paid" />

// ❌ Generic shadow on invoice
<div className="rounded-xl bg-white shadow-2xl">…</div>

// ✅ Document utility
<article className="wf-doc p-10">…</article>
```
