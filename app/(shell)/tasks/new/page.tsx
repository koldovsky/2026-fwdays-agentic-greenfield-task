import { QuickCapture } from "@/components/tasks/quick-capture";

export default function NewTaskPage() {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold leading-8 text-foreground">
          Add a task
        </h1>
        <p className="text-sm text-foreground-muted">
          Just 2 minutes. You can stop after.
        </p>
      </header>
      <QuickCapture autoFocus submitLabel="Save and continue" />
    </div>
  );
}
