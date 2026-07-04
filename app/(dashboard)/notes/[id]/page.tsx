import { notFound } from "next/navigation";
import { verifySession } from "@/app/lib/dal";
import { getOwnedNote } from "@/lib/notes/queries";
import { listFolders } from "@/lib/folders/queries";
import { listTags } from "@/lib/tags/queries";
import { renderMarkdown } from "@/lib/markdown/render";
import { sanitizeServerHtml } from "@/lib/markdown/sanitize.server";
import { NoteEditor } from "@/app/components/notes/note-editor";

export default async function NotePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ duplicated?: string }>;
}) {
  const { id } = await params;
  const { duplicated } = await searchParams;
  const { userId } = await verifySession();
  const note = await getOwnedNote(userId, id);

  if (!note) {
    notFound();
  }

  const [folders, tags] = await Promise.all([
    listFolders(userId),
    listTags(userId),
  ]);

  const initialPreviewHtml = sanitizeServerHtml(renderMarkdown(note.content));

  return (
    <NoteEditor
      key={note.id}
      noteId={note.id}
      initialTitle={note.title}
      initialContent={note.content}
      initialPreviewHtml={initialPreviewHtml}
      folders={folders}
      allTags={tags}
      initialFolderId={note.folderId}
      initialTagIds={note.tags.map((noteTag) => noteTag.tagId)}
      showDuplicateToast={duplicated === "true"}
    />
  );
}
