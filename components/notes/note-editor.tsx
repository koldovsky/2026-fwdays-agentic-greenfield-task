"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { Input, IconButton, Button } from "@notely-design/components";
import { Textarea } from "@/components/ui/textarea";
import { Toast } from "@/components/ui/toast";
import { IconTrash, IconCopy } from "@/components/icons";
import { updateNote, softDeleteNote, duplicateNote } from "@/app/actions/notes";
import { FolderPicker } from "@/components/notes/folder-picker";
import { TagPicker } from "@/components/notes/tag-picker";
import { EditorToolbar, type ToolbarAction } from "@/components/notes/editor-toolbar";
import { NotePreview } from "@/components/notes/note-preview";
import {
  applyHeading,
  applyListPrefix,
  applyCodeFormatting,
} from "@/lib/markdown/editing";
import { renderMarkdown } from "@/lib/markdown/render";
import { sanitizeClientHtml } from "@/lib/markdown/sanitize.client";

type SaveStatus = "idle" | "pending" | "saving" | "saved" | "error";
type EditorMode = "write" | "preview";

type NoteEditorProps = {
  noteId: string;
  initialTitle: string;
  initialContent: string;
  initialPreviewHtml: string;
  folders: { id: string; name: string }[];
  allTags: { id: string; name: string }[];
  initialFolderId: string | null;
  initialTagIds: string[];
  showDuplicateToast: boolean;
};

const AUTOSAVE_DELAY_MS = 1000;

const statusLabel: Record<SaveStatus, string> = {
  idle: "",
  pending: "Unsaved changes",
  saving: "Saving…",
  saved: "Saved",
  error: "Couldn't save — retry",
};

export function NoteEditor({
  noteId,
  initialTitle,
  initialContent,
  initialPreviewHtml,
  folders,
  allTags,
  initialFolderId,
  initialTagIds,
  showDuplicateToast,
}: NoteEditorProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [mode, setMode] = useState<EditorMode>("write");
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [showToast, setShowToast] = useState(showDuplicateToast);
  const [isDeleting, startDeleteTransition] = useTransition();
  const [isDuplicating, startDuplicateTransition] = useTransition();

  // Show the duplicate-confirmation toast once, then strip the query param so a
  // reload of this URL doesn't re-trigger it.
  useEffect(() => {
    if (showDuplicateToast) {
      router.replace(pathname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pendingSelectionRef = useRef<{ start: number; end: number } | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestRef = useRef({ title, content });
  useEffect(() => {
    latestRef.current = { title, content };
  });

  // Restore cursor/selection after a toolbar/shortcut edit re-renders the textarea.
  useEffect(() => {
    if (pendingSelectionRef.current && textareaRef.current) {
      const { start, end } = pendingSelectionRef.current;
      textareaRef.current.setSelectionRange(start, end);
      textareaRef.current.focus();
      pendingSelectionRef.current = null;
    }
  });

  const previewHtml = useMemo(() => {
    if (content === initialContent) {
      return initialPreviewHtml;
    }
    return sanitizeClientHtml(renderMarkdown(content));
  }, [content, initialContent, initialPreviewHtml]);

  const save = useCallback(async () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setStatus("saving");
    const result = await updateNote(noteId, latestRef.current);
    setStatus(result.ok ? "saved" : "error");
  }, [noteId]);

  const scheduleSave = useCallback(() => {
    setStatus("pending");
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null;
      void save();
    }, AUTOSAVE_DELAY_MS);
  }, [save]);

  // Flush a pending debounced save on unmount (e.g. route change).
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        void save();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Flush a pending debounced save if the tab is hidden or the page unloads.
  useEffect(() => {
    const flush = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
        void save();
      }
    };
    document.addEventListener("visibilitychange", flush);
    window.addEventListener("beforeunload", flush);
    return () => {
      document.removeEventListener("visibilitychange", flush);
      window.removeEventListener("beforeunload", flush);
    };
  }, [save]);

  const handleDelete = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    startDeleteTransition(async () => {
      await softDeleteNote(noteId);
    });
  };

  const handleDuplicate = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    startDuplicateTransition(async () => {
      await duplicateNote(noteId);
    });
  };

  const handleToolbarAction = useCallback(
    (action: ToolbarAction) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const { selectionStart, selectionEnd, value } = textarea;
      const result =
        action === "heading-1"
          ? applyHeading(value, selectionStart, selectionEnd, 1)
          : action === "heading-2"
            ? applyHeading(value, selectionStart, selectionEnd, 2)
            : action === "list-bullet"
              ? applyListPrefix(value, selectionStart, selectionEnd, "- ")
              : action === "list-ordered"
                ? applyListPrefix(value, selectionStart, selectionEnd, "1. ")
                : action === "list-checks"
                  ? applyListPrefix(value, selectionStart, selectionEnd, "- [ ] ")
                  : applyCodeFormatting(value, selectionStart, selectionEnd);

      pendingSelectionRef.current = result.selection;
      setContent(result.text);
      scheduleSave();
    },
    [scheduleSave]
  );

  const handleContentKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      const mod = event.metaKey || event.ctrlKey;
      if (!mod) return;

      let action: ToolbarAction | null = null;
      if (event.altKey && event.code === "Digit1") action = "heading-1";
      else if (event.altKey && event.code === "Digit2") action = "heading-2";
      else if (event.shiftKey && event.code === "Digit8") action = "list-bullet";
      else if (event.shiftKey && event.code === "Digit7") action = "list-ordered";
      else if (event.shiftKey && event.code === "Digit9") action = "list-checks";
      else if (!event.shiftKey && !event.altKey && event.code === "KeyE") action = "code";

      if (action) {
        event.preventDefault();
        handleToolbarAction(action);
      }
    },
    [handleToolbarAction]
  );

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-6 sm:px-6">
      <div className="flex items-center justify-between gap-2">
        {status === "error" ? (
          <button
            type="button"
            className="text-xs underline"
            style={{ color: "var(--color-danger)" }}
            onClick={() => void save()}
          >
            {statusLabel.error}
          </button>
        ) : (
          <span
            className="text-xs"
            style={{ color: "var(--color-text-tertiary)" }}
            role="status"
            aria-live="polite"
          >
            {statusLabel[status]}
          </span>
        )}
        <div className="flex items-center gap-1">
          <IconButton
            icon={<IconCopy />}
            label="Duplicate note"
            variant="ghost"
            onClick={handleDuplicate}
            disabled={isDuplicating}
          />
          <IconButton
            icon={<IconTrash />}
            label="Delete note"
            variant="ghost"
            onClick={handleDelete}
            disabled={isDeleting}
          />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <FolderPicker
          noteId={noteId}
          folders={folders}
          initialFolderId={initialFolderId}
        />
        <TagPicker noteId={noteId} allTags={allTags} initialTagIds={initialTagIds} />
      </div>
      <Input
        aria-label="Note title"
        placeholder="Untitled"
        size="lg"
        value={title}
        onChange={(event) => {
          setTitle(event.target.value);
          scheduleSave();
        }}
      />
      <div className="flex items-center justify-between gap-2">
        {mode === "write" && <EditorToolbar onAction={handleToolbarAction} />}
        <div className="ml-auto flex items-center gap-1">
          <Button
            type="button"
            variant={mode === "write" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setMode("write")}
          >
            Write
          </Button>
          <Button
            type="button"
            variant={mode === "preview" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setMode("preview")}
          >
            Preview
          </Button>
        </div>
      </div>
      {mode === "write" ? (
        <Textarea
          ref={textareaRef}
          aria-label="Note content"
          placeholder="Start writing…"
          rows={16}
          value={content}
          onChange={(event) => {
            setContent(event.target.value);
            scheduleSave();
          }}
          onKeyDown={handleContentKeyDown}
        />
      ) : (
        <NotePreview html={previewHtml} />
      )}
      {showToast && (
        <Toast message="Note duplicated" onDismiss={() => setShowToast(false)} />
      )}
    </div>
  );
}
