import {
  Badge,
  Button,
  Card,
  IconButton,
  NoteCard,
} from "@notely-design/components";

export default function Home() {
  return (
    <div className="flex flex-1 justify-center bg-[var(--color-bg)] px-6 py-16 sm:py-24">
      <main className="flex w-full max-w-3xl flex-col gap-10">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-2">
            <Badge tone="primary" variant="soft">
              Design system connected
            </Badge>
            <h1 className="t-h1" style={{ color: "var(--color-text)" }}>
              Notely
            </h1>
            <p
              className="t-body-lg max-w-md"
              style={{ color: "var(--color-text-secondary)" }}
            >
              A clean, minimal, calm place for your notes.
            </p>
          </div>
          <IconButton
            icon={<span aria-hidden>⚙</span>}
            label="Settings"
            variant="ghost"
          />
        </div>

        <div className="flex gap-3">
          <Button variant="primary">New note</Button>
          <Button variant="secondary">Import notes</Button>
        </div>

        <Card padding={0} elevation={0} style={{ overflow: "hidden" }}>
          <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2">
            <NoteCard
              title="Roadmap"
              snippet="Phase 1 ships auth, notes CRUD, search, and autosave."
              date="Edited 2 min ago"
              folder="Work"
              tags={["planning"]}
              pinned
              layout="grid"
            />
            <NoteCard
              title="Reading list"
              snippet="Content over chrome. Calm by default. Fast feels good."
              date="Yesterday"
              folder="Personal"
              tags={["ideas", "design"]}
              favorite
              layout="grid"
            />
          </div>
        </Card>
      </main>
    </div>
  );
}
