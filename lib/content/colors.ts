import type { HighlighterKey } from './types'

// 8 highlighter colors from the design system, each with a fixed meaning.
// Labels are English (UI language). Order matches the HighlighterPicker swatch row.
export const NOTE_COLORS: { value: HighlighterKey; label: string }[] = [
  { value: 'yellow', label: 'Idea' },
  { value: 'amber', label: 'Question' },
  { value: 'coral', label: 'Disagree' },
  { value: 'pink', label: 'Resonates' },
  { value: 'purple', label: 'Theme' },
  { value: 'blue', label: 'Fact' },
  { value: 'teal', label: 'Term' },
  { value: 'green', label: 'Quote' },
]

export const DEFAULT_NOTE_COLOR: HighlighterKey = 'yellow'

export function isNoteColor(value: string): value is HighlighterKey {
  return NOTE_COLORS.some((c) => c.value === value)
}
