"use client";

import { useState, useTransition } from "react";
import { Tag as TagChip, Input, IconButton } from "@notely-design/components";
import { IconPlus } from "@/app/components/icons";
import { addNoteTag, removeNoteTag, createAndAssignTag } from "@/app/actions/notes";

type TagOption = { id: string; name: string };

type TagPickerProps = {
  noteId: string;
  allTags: TagOption[];
  initialTagIds: string[];
};

export function TagPicker({ noteId, allTags, initialTagIds }: TagPickerProps) {
  const [tags, setTags] = useState(allTags);
  const [tagIds, setTagIds] = useState(() => new Set(initialTagIds));
  const [creating, setCreating] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [, startTransition] = useTransition();

  const assigned = tags.filter((tag) => tagIds.has(tag.id));
  const unassigned = tags.filter((tag) => !tagIds.has(tag.id));

  const addTag = (tagId: string) => {
    setTagIds((prev) => new Set(prev).add(tagId));
    startTransition(async () => {
      await addNoteTag(noteId, tagId);
    });
  };

  const removeTag = (tagId: string) => {
    setTagIds((prev) => {
      const next = new Set(prev);
      next.delete(tagId);
      return next;
    });
    startTransition(async () => {
      await removeNoteTag(noteId, tagId);
    });
  };

  const submitNewTag = async () => {
    const trimmed = newTagName.trim();
    setCreating(false);
    setNewTagName("");
    if (!trimmed) return;

    const result = await createAndAssignTag(noteId, trimmed);
    if (result.ok) {
      setTags((prev) => [...prev, result.tag]);
      setTagIds((prev) => new Set(prev).add(result.tag.id));
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {assigned.map((tag) => (
        <TagChip key={tag.id} removable onRemove={() => removeTag(tag.id)}>
          {tag.name}
        </TagChip>
      ))}
      {unassigned.map((tag) => (
        <TagChip
          key={tag.id}
          onClick={() => addTag(tag.id)}
          style={{ borderStyle: "dashed" }}
        >
          {tag.name}
        </TagChip>
      ))}
      {creating ? (
        <form
          className="inline-flex"
          action={async () => {
            await submitNewTag();
          }}
        >
          <Input
            autoFocus
            aria-label="New tag name"
            size="sm"
            value={newTagName}
            placeholder="Tag name"
            onChange={(event) => setNewTagName(event.target.value)}
            onBlur={(event) => event.currentTarget.form?.requestSubmit()}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                setNewTagName("");
                setCreating(false);
              }
            }}
          />
        </form>
      ) : (
        <IconButton
          icon={<IconPlus width={13} height={13} />}
          label="Add tag"
          variant="ghost"
          size="sm"
          onClick={() => setCreating(true)}
        />
      )}
    </div>
  );
}
