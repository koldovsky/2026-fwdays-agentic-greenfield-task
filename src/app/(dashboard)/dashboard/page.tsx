import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="wf-display">Dashboard</h1>
        <p className="mt-1 text-wf-text-2">
          Overview of invoices, revenue, and overdue items.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Total revenue</CardTitle>
            <CardDescription>This month</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="wf-mono text-3xl font-semibold tracking-tight">—</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Open invoices</CardTitle>
            <CardDescription>Awaiting payment</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="wf-mono text-3xl font-semibold tracking-tight">—</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Overdue</CardTitle>
            <CardDescription>Past due date</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="wf-mono text-3xl font-semibold tracking-tight">—</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
