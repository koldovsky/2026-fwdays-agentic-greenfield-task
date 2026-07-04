"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { Note, Folder, Tag } from "@prisma/client";
import { Input, Select, Tag as TagChip } from "@notely-design/components";
import { IconSearch } from "@/components/icons";
import { NoteList } from "@/components/notes/note-list";
import { NoteEmptyState } from "@/components/notes/note-empty-state";

type SearchViewProps = {
  folders: Folder[];
  tags: Tag[];
  initialQuery: string;
  initialFolderId: string;
  initialTagIds: string[];
  initialFrom: string;
  initialTo: string;
  initialNotes: Note[];
};

type SearchState = {
  query: string;
  folderId: string;
  tagIds: Set<string>;
  from: string;
  to: string;
};

const DEBOUNCE_MS = 300;
const ALL_FOLDERS = "";

function toQueryString(state: SearchState) {
  const qs = new URLSearchParams();
  if (state.query) qs.set("q", state.query);
  if (state.folderId) qs.set("folderId", state.folderId);
  if (state.tagIds.size > 0) qs.set("tagIds", Array.from(state.tagIds).join(","));
  if (state.from) qs.set("from", state.from);
  if (state.to) qs.set("to", state.to);
  return qs;
}

export function SearchView({
  folders,
  tags,
  initialQuery,
  initialFolderId,
  initialTagIds,
  initialFrom,
  initialTo,
  initialNotes,
}: SearchViewProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [query, setQuery] = useState(initialQuery);
  const [folderId, setFolderId] = useState(initialFolderId);
  const [tagIds, setTagIds] = useState(() => new Set(initialTagIds));
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);
  const [notes, setNotes] = useState(initialNotes);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const isFirstRun = useRef(true);

  const runSearch = useCallback(
    (state: SearchState) => {
      const qs = toQueryString(state);
      router.replace(qs.toString() ? `${pathname}?${qs}` : pathname);

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      fetch(`/api/search?${qs}`, { signal: controller.signal })
        .then((res) => res.json())
        .then((data: { notes: Note[] }) => {
          setNotes(
            data.notes.map((note) => ({
              ...note,
              createdAt: new Date(note.createdAt),
              updatedAt: new Date(note.updatedAt),
              deletedAt: note.deletedAt ? new Date(note.deletedAt) : null,
            }))
          );
        })
        .catch(() => {
          // A failed live-search fetch (including abort of a superseded request)
          // just leaves whatever results are already on screen.
        });
    },
    [pathname, router]
  );

  useEffect(() => {
    // Skip on mount: the server already rendered results matching the initial URL.
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      runSearch({ query, folderId, tagIds, from, to });
    }, DEBOUNCE_MS);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, folderId, tagIds, from, to]);

  const toggleTag = (tagId: string) => {
    setTagIds((prev) => {
      const next = new Set(prev);
      if (next.has(tagId)) next.delete(tagId);
      else next.add(tagId);
      return next;
    });
  };

  const folderOptions = [
    { value: ALL_FOLDERS, label: "All folders" },
    ...folders.map((folder) => ({ value: folder.id, label: folder.name })),
  ];

  return (
    <div className="flex flex-col gap-4 px-4 py-4 sm:px-6">
      <h1 className="t-h2" style={{ color: "var(--color-text)" }}>
        Search
      </h1>
      <Input
        aria-label="Search notes"
        placeholder="Search notes"
        leadingIcon={<IconSearch />}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      <div className="flex flex-wrap items-center gap-3">
        <Select
          aria-label="Filter by folder"
          size="sm"
          placeholder=""
          value={folderId}
          options={folderOptions}
          onChange={(event) => setFolderId(event.target.value)}
        />
        <Input
          aria-label="From date"
          type="date"
          size="sm"
          value={from}
          onChange={(event) => setFrom(event.target.value)}
        />
        <Input
          aria-label="To date"
          type="date"
          size="sm"
          value={to}
          onChange={(event) => setTo(event.target.value)}
        />
      </div>
      {tags.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {tags.map((tag) => (
            <TagChip
              key={tag.id}
              onClick={() => toggleTag(tag.id)}
              style={{ opacity: tagIds.has(tag.id) ? 1 : 0.5 }}
            >
              {tag.name}
            </TagChip>
          ))}
        </div>
      )}
      {notes.length === 0 ? (
        <NoteEmptyState
          icon="search"
          title="No matching notes"
          description="Try a different search term or filter."
        />
      ) : (
        <NoteList notes={notes} />
      )}
    </div>
  );
}
