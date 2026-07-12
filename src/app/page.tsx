import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <span className="text-lg font-semibold tracking-tight">
            Invoice Maker
          </span>
          <div className="flex items-center gap-3">
            <Button
              className="hidden sm:inline-flex"
              nativeButton={false}
              variant="ghost"
              render={<Link href="/dashboard" />}
            >
              Open app
            </Button>
            <Button nativeButton={false} render={<Link href="/invoices/new" />}>
              Create invoice
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center gap-12 px-6 py-16">
        <div className="space-y-4">
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            Professional invoices, without the overhead
          </h1>
          <p className="max-w-2xl text-lg text-muted-foreground">
            Create, send, and track invoices for your business. Built for
            freelancers and small teams who need clarity, not complexity.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Button
              nativeButton={false}
              size="lg"
              render={<Link href="/dashboard" />}
            >
              Go to dashboard
            </Button>
            <Button
              nativeButton={false}
              size="lg"
              variant="outline"
              render={<Link href="/invoices" />}
            >
              View invoices
            </Button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Fast creation</CardTitle>
              <CardDescription>Draft invoices in minutes</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Line items, taxes, and client details in one focused workflow.
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>PDF-експорт</CardTitle>
              <CardDescription>Завантажуйте готовий документ</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Двомовний PDF через безстанний серверний рендер шаблону.
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Статуси вручну</CardTitle>
              <CardDescription>Без обліку платежів</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Чернетка, надіслано, оплачено, скасовано — ви позначаєте самі.
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
