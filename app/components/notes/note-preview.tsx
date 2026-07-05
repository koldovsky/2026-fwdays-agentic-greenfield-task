type NotePreviewProps = {
  html: string;
};

export function NotePreview({ html }: NotePreviewProps) {
  return (
    <div
      className="note-preview t-body min-h-40 rounded-[var(--radius-md)] border px-3 py-2.5"
      style={{
        borderColor: "var(--color-border-strong)",
        background: "var(--color-card)",
        color: "var(--color-text)",
      }}
      // `html` is pre-sanitized by the caller (server-side via sanitize-html for
      // unmodified content, client-side via DOMPurify once the user has edited —
      // see components/notes/note-editor.tsx).
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
