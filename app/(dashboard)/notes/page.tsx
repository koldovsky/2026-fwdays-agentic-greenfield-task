import { PlaceholderPage } from "@/components/layout/placeholder-page";

export default function NotesPage() {
  return (
    <PlaceholderPage
      title="All notes"
      description="No notes yet"
      icon="inbox"
      action={{ label: "New note", href: "/notes/new" }}
    />
  );
}
