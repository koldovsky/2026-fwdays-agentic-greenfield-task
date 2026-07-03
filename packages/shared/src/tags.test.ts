import { describe, expect, it } from 'vitest';
import type { Tag, TimeEntry } from './contracts';
import { filterEntriesByTags } from './tags';

function tag(id: string): Tag {
  return { id, userId: 'u1', name: id, color: null };
}

function entry(id: string, tags: Tag[]): TimeEntry {
  return {
    id,
    userId: 'u1',
    note: id,
    startedAt: '2026-06-01T09:00:00.000Z',
    stoppedAt: '2026-06-01T10:00:00.000Z',
    durationSec: 3600,
    tags,
    createdAt: '2026-06-01T09:00:00.000Z',
    updatedAt: '2026-06-01T10:00:00.000Z',
  };
}

const design = tag('design');
const admin = tag('admin');
const meetings = tag('meetings');

const entries = [
  entry('a', [design]),
  entry('b', [admin, meetings]),
  entry('c', []),
];

describe('filterEntriesByTags', () => {
  it('returns all entries when the selection is empty', () => {
    expect(filterEntriesByTags(entries, [])).toEqual(entries);
  });

  it('returns entries carrying the single selected tag', () => {
    expect(filterEntriesByTags(entries, ['design']).map((e) => e.id)).toEqual(['a']);
  });

  it('returns entries matching ANY of several selected tags', () => {
    expect(filterEntriesByTags(entries, ['design', 'admin']).map((e) => e.id)).toEqual([
      'a',
      'b',
    ]);
  });

  it('excludes untagged entries when filtering', () => {
    expect(filterEntriesByTags(entries, ['meetings']).map((e) => e.id)).toEqual(['b']);
  });

  it('returns [] when no entry carries a selected tag', () => {
    expect(filterEntriesByTags(entries, ['nope'])).toEqual([]);
  });
});
