import { useState } from 'react';
import { ActivityIndicator, RefreshControl, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import type { TimeEntry } from '@honeydo/shared';
import {
  filterEntriesByTags,
  formatDurationCompact,
  groupEntriesByDay,
} from '@honeydo/shared';
import { EntryFormModal, type EntryFormValues } from '../components/EntryFormModal';
import { FilterChips } from '../components/FilterChips';
import { TimerEntry } from '../components/TimerEntry';
import { useTags } from '../hooks/useTags';
import {
  useContinueEntry,
  useDeleteEntry,
  useEntries,
  useUpdateEntry,
} from '../hooks/useTimeEntries';
import { useTheme } from '../theme';

type Row =
  | { kind: 'header'; date: string; totalSec: number }
  | { kind: 'entry'; entry: TimeEntry };

/** Friendly local-day label: Today / Yesterday / "Monday, Jun 26". */
function dayLabel(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((today.getTime() - date.getTime()) / 86_400_000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}

/** History tab: entries grouped by local day, newest first, with per-day totals. */
export function HistoryScreen() {
  const t = useTheme();
  const { data: entries = [], isLoading, refetch } = useEntries();
  const { data: tags = [] } = useTags();
  const continueEntry = useContinueEntry();
  const update = useUpdateEntry();
  const remove = useDeleteEntry();
  const [editing, setEditing] = useState<TimeEntry | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  };

  const filtered = filterEntriesByTags(entries, selectedTags);
  const rows: Row[] = [];
  for (const group of groupEntriesByDay(filtered)) {
    rows.push({ kind: 'header', date: group.date, totalSec: group.totalSec });
    for (const entry of group.entries) rows.push({ kind: 'entry', entry });
  }
  const filteringToEmpty = entries.length > 0 && rows.length === 0;

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: t.colors.bg }}>
      <View style={{ paddingHorizontal: t.screenGutter, paddingTop: t.space[2], paddingBottom: t.space[2] }}>
        <Text style={{ color: t.colors.text, fontSize: t.fontSize.largeTitle, fontWeight: t.fontWeight.heavy }}>
          History
        </Text>
      </View>

      <FilterChips tags={tags} selected={selectedTags} onChange={setSelectedTags} />

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={t.colors.accent} />
        </View>
      ) : entries.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: t.space[7] }}>
          <Text style={{ color: t.colors.text, fontSize: t.fontSize.title2, fontWeight: t.fontWeight.heavy, textAlign: 'center' }}>
            No entries yet
          </Text>
          <Text style={{ color: t.colors.textMuted, fontSize: t.fontSize.callout, textAlign: 'center', marginTop: t.space[2] }}>
            Track something on the Timer tab and your days will fill in here.
          </Text>
        </View>
      ) : filteringToEmpty ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: t.space[7] }}>
          <Text style={{ color: t.colors.text, fontSize: t.fontSize.title2, fontWeight: t.fontWeight.heavy, textAlign: 'center' }}>
            No entries with these tags
          </Text>
          <Text style={{ color: t.colors.textMuted, fontSize: t.fontSize.callout, textAlign: 'center', marginTop: t.space[2] }}>
            Try a different tag, or tap All to clear the filter.
          </Text>
        </View>
      ) : (
        <FlashList
          data={rows}
          keyExtractor={(item) =>
            item.kind === 'header' ? `h-${item.date}` : item.entry.id
          }
          getItemType={(item) => item.kind}
          contentContainerStyle={{ paddingHorizontal: t.screenGutter, paddingBottom: t.space[8] }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void onRefresh()}
              tintColor={t.colors.accent}
            />
          }
          renderItem={({ item }) =>
            item.kind === 'header' ? (
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingTop: t.space[5],
                  paddingBottom: t.space[2],
                }}
              >
                <Text style={{ color: t.colors.textMuted, fontSize: t.fontSize.footnote, fontWeight: t.fontWeight.bold, letterSpacing: 1 }}>
                  {dayLabel(item.date).toUpperCase()}
                </Text>
                <Text style={{ color: t.colors.text, fontSize: t.fontSize.subhead, fontWeight: t.fontWeight.heavy, fontVariant: ['tabular-nums'] }}>
                  {formatDurationCompact(item.totalSec)}
                </Text>
              </View>
            ) : (
              <View style={{ paddingVertical: t.space[1] }}>
                <TimerEntry
                  entry={item.entry}
                  onContinue={(entry) => continueEntry.mutate(entry.id)}
                  onPress={setEditing}
                />
              </View>
            )
          }
        />
      )}

      <EntryFormModal
        visible={editing !== null}
        entry={editing}
        onClose={() => setEditing(null)}
        onSubmit={(v: EntryFormValues) => {
          if (!editing) return;
          update.mutate({
            id: editing.id,
            body: {
              note: v.note,
              startedAt: v.startedAt.toISOString(),
              stoppedAt: v.stoppedAt.toISOString(),
              tagIds: v.tagIds,
            },
          });
        }}
        onDelete={(entry) => {
          remove.mutate(entry.id);
          setEditing(null);
        }}
      />
    </SafeAreaView>
  );
}
