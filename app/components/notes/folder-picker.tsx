"use client";

import { useState, useTransition } from "react";
import { Select } from "@notely-design/components";
import { assignNoteFolder } from "@/app/actions/notes";

type FolderOption = { id: string; name: string };

type FolderPickerProps = {
  noteId: string;
  folders: FolderOption[];
  initialFolderId: string | null;
};

const NONE_VALUE = "__none__";

export function FolderPicker({
  noteId,
  folders,
  initialFolderId,
}: FolderPickerProps) {
  const [folderId, setFolderId] = useState(initialFolderId ?? NONE_VALUE);
  const [, startTransition] = useTransition();

  const options = [
    { value: NONE_VALUE, label: "No folder" },
    ...folders.map((folder) => ({ value: folder.id, label: folder.name })),
  ];

  return (
    <Select
      aria-label="Folder"
      size="sm"
      value={folderId}
      options={options}
      onChange={(event) => {
        const value = event.target.value;
        setFolderId(value);
        startTransition(async () => {
          await assignNoteFolder(noteId, value === NONE_VALUE ? null : value);
        });
      }}
    />
  );
}
