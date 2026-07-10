"use client";

import { REFLECTION_TAGS, type ReflectionTagId } from "@/lib/recap/constants";

interface ReflectionTagsProps {
  selected: ReflectionTagId[];
  onToggle: (tagId: ReflectionTagId) => void;
}

export function ReflectionTags({ selected, onToggle }: ReflectionTagsProps) {
  return (
    <fieldset>
      <legend className="mb-3 text-sm font-medium text-foreground-muted">
        What helped today? (optional)
      </legend>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Reflection tags">
        {REFLECTION_TAGS.map((tag) => {
          const isSelected = selected.includes(tag.id);

          return (
            <button
              key={tag.id}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onToggle(tag.id)}
              className={`inline-flex min-h-11 items-center rounded-full px-3 py-2 text-sm font-medium transition-colors duration-150 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                isSelected
                  ? "bg-accent-subtle text-accent ring-2 ring-ring ring-offset-2 ring-offset-background"
                  : "bg-surface-muted text-foreground-muted hover:bg-border"
              }`}
            >
              {tag.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
