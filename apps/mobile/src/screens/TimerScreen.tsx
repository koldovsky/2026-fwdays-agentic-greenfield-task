import { useEffect, useState } from 'react';
import {
  Keyboard,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Play, Plus, Square } from 'lucide-react-native';
import type { TimeEntry } from '@honeydo/shared';
import { EmptyState } from '../components/EmptyState';
import { EntryFormModal, type EntryFormValues } from '../components/EntryFormModal';
import { KEYBOARD_DONE_ID } from '../components/KeyboardDoneAccessory';
import { PressableScale } from '../components/PressableScale';
import { TagPicker } from '../components/TagPicker';
import { TimerEntry } from '../components/TimerEntry';
import { useElapsed } from '../hooks/useElapsed';
import {
  useContinueEntry,
  useDeleteEntry,
  useEntries,
  useManualEntry,
  useRunningEntry,
  useStartEntry,
  useStopEntry,
  useUpdateEntry,
} from '../hooks/useTimeEntries';
import { formatDurationCompact } from '@honeydo/shared';
import { useAuthStore } from '../store/authStore';
import { useTheme } from '../theme';

/** True when an ISO timestamp falls on the same local calendar day as `ref`. */
function isSameLocalDay(iso: string, ref: Date): boolean {
  const d = new Date(iso);
  return (
    d.getFullYear() === ref.getFullYear() &&
    d.getMonth() === ref.getMonth() &&
    d.getDate() === ref.getDate()
  );
}

/**
 * Timer tab: the core loop. A start/stop control with a live clock, today's entries,
 * and a manual-entry / edit sheet. First run shows the empty hero (FR-SHELL-03).
 */
export function TimerScreen() {
  const t = useTheme();
  const { data: entries = [], isLoading, refetch } = useEntries();
  const running = useRunningEntry();

  // Local pull state so this screen's spinner is independent of the shared query's
  // background refetches (e.g. a pull on History shouldn't spin here).
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  };

  const start = useStartEntry();
  const stop = useStopEntry();
  const continueEntry = useContinueEntry();
  const manual = useManualEntry();
  const update = useUpdateEntry();
  const remove = useDeleteEntry();

  const [note, setNote] = useState('');
  const [startTags, setStartTags] = useState<string[]>([]);
  const [editing, setEditing] = useState<TimeEntry | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  // First run shows the empty hero; its CTA reveals the composer (input auto-focused).
  const [composing, setComposing] = useState(false);

  // Seed the input from the running entry (or clear it) when the running entry changes.
  const runningId = running?.id;
  const runningNote = running?.note;
  useEffect(() => {
    setNote(runningId ? (runningNote ?? '') : '');
  }, [runningId, runningNote]);

  const onToggle = () => {
    if (running) {
      if (note.trim() && note.trim() !== running.note) {
        update.mutate({ id: running.id, body: { note: note.trim() } });
      }
      stop.mutate(running.id);
    } else if (note.trim()) {
      start.mutate({ note: note.trim(), tagIds: startTags });
      setStartTags([]);
    }
  };

  const now = new Date();
  const todayStopped = entries.filter(
    (e) => e.stoppedAt !== null && isSameLocalDay(e.startedAt, now),
  );
  const todayTotal = todayStopped.reduce((sum, e) => sum + (e.durationSec ?? 0), 0);
  const firstRun =
    !isLoading && entries.length === 0 && !running && !composing;

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: t.colors.bg }}>
      {/* First-run only: the same warm amber hero glow as the auth screen. */}
      {firstRun ? (
        <LinearGradient
          colors={[t.colors.accentSoft, 'transparent']}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 360 }}
          pointerEvents="none"
        />
      ) : null}

      <Header
        onAdd={() => {
          Keyboard.dismiss();
          setAddOpen(true);
        }}
      />

      {firstRun ? (
        <EmptyState
          title="Your hive is empty"
          description="Start a timer with a quick note about what you're doing. Stop it when you switch. That's the whole thing."
          actionLabel="Start your first entry"
          onAction={() => setComposing(true)}
          tip="You can start from your Home Screen too"
        />
      ) : (
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: t.screenGutter,
            // Extra top room so the running card's amber glow isn't clipped by the scroll edge.
            paddingTop: t.space[7],
            paddingBottom: t.screenGutter,
            gap: t.space[4],
          }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          alwaysBounceVertical
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void onRefresh()}
              tintColor={t.colors.accent}
            />
          }
        >
          <StartControl
            running={running}
            note={note}
            onChangeNote={setNote}
            onToggle={onToggle}
            autoFocus={composing}
            tagIds={startTags}
            onChangeTags={setStartTags}
            onBlur={() => {
              // Leaving an empty composer with nothing running collapses back to the hero.
              if (!running && !note.trim()) setComposing(false);
            }}
          />

          {todayStopped.length > 0 ? (
            <View style={{ gap: t.space[3] }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={eyebrow(t)}>TODAY</Text>
                <Text style={{ color: t.colors.text, fontSize: t.fontSize.subhead, fontWeight: t.fontWeight.heavy, fontVariant: ['tabular-nums'] }}>
                  {formatDurationCompact(todayTotal)}
                </Text>
              </View>
              {todayStopped.map((e) => (
                <TimerEntry
                  key={e.id}
                  entry={e}
                  onContinue={(entry) => continueEntry.mutate(entry.id)}
                  onPress={setEditing}
                />
              ))}
            </View>
          ) : null}
        </ScrollView>
      )}

      <EntryFormModal
        visible={addOpen}
        onClose={() => setAddOpen(false)}
        onSubmit={async (v: EntryFormValues) => {
          await manual.mutateAsync({
            note: v.note,
            startedAt: v.startedAt.toISOString(),
            stoppedAt: v.stoppedAt.toISOString(),
            tagIds: v.tagIds,
          });
        }}
      />
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

const eyebrow = (t: ReturnType<typeof useTheme>) =>
  ({
    color: t.colors.textMuted,
    fontSize: t.fontSize.footnote,
    fontWeight: t.fontWeight.bold,
    letterSpacing: 1,
  }) as const;

function Header({ onAdd }: { onAdd: () => void }) {
  const t = useTheme();
  const user = useAuthStore((s) => s.user);
  const firstName = user?.name?.trim().split(/\s+/)[0];
  const hour = new Date().getHours();
  const timeGreeting =
    hour < 12 ? 'GOOD MORNING' : hour < 18 ? 'GOOD AFTERNOON' : 'GOOD EVENING';
  const greeting = firstName
    ? `${timeGreeting}, ${firstName.toUpperCase()}`
    : timeGreeting;
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        paddingHorizontal: t.screenGutter,
        paddingTop: t.space[2],
        paddingBottom: t.space[2],
      }}
    >
      <View>
        <Text style={{ color: t.colors.accent, fontSize: t.fontSize.footnote, fontWeight: t.fontWeight.bold, letterSpacing: 0.5, marginBottom: 2 }}>
          {greeting}
        </Text>
        <Text style={{ color: t.colors.text, fontSize: t.fontSize.largeTitle, fontWeight: t.fontWeight.heavy }}>
          Today
        </Text>
      </View>
      <PressableScale
        onPress={onAdd}
        accessibilityRole="button"
        accessibilityLabel="Add a manual entry"
        hitSlop={8}
        style={{
          width: 40,
          height: 40,
          borderRadius: t.radius.pill,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: t.colors.surfaceAlt,
          borderWidth: 1,
          borderColor: t.colors.border,
        }}
      >
        <Plus size={20} color={t.colors.accent} />
      </PressableScale>
    </View>
  );
}

interface StartControlProps {
  running: TimeEntry | undefined;
  note: string;
  onChangeNote: (note: string) => void;
  onToggle: () => void;
  autoFocus?: boolean;
  tagIds: string[];
  onChangeTags: (tagIds: string[]) => void;
  onBlur?: () => void;
}

/** The start/running control card: note input, tag picker, live elapsed, and the toggle. */
function StartControl({
  running,
  note,
  onChangeNote,
  onToggle,
  autoFocus,
  tagIds,
  onChangeTags,
  onBlur,
}: StartControlProps) {
  const t = useTheme();
  const isRunning = !!running;
  const elapsed = useElapsed(running?.startedAt ?? null, isRunning);
  const canStart = isRunning || note.trim().length > 0;

  const card = (
    <View
      style={[
        {
          backgroundColor: isRunning ? t.colors.accentFaint : t.colors.surface,
          borderWidth: 1,
          borderColor: isRunning ? t.colors.accentSoft : t.colors.border,
          borderRadius: t.radius.lg,
          padding: t.space[5],
          gap: t.space[4],
        },
        isRunning ? null : t.shadow[2],
      ]}
    >
      <TextInput
        value={note}
        onChangeText={onChangeNote}
        onBlur={onBlur}
        placeholder="What are you working on?"
        placeholderTextColor={t.colors.textMuted}
        autoFocus={autoFocus}
        autoCorrect={false}
        spellCheck={false}
        returnKeyType="done"
        inputAccessoryViewID={KEYBOARD_DONE_ID}
        style={{ color: t.colors.text, fontSize: t.fontSize.headline, fontWeight: t.fontWeight.semibold }}
      />
      {!isRunning ? <TagPicker value={tagIds} onChange={onChangeTags} /> : null}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text
          style={{
            color: isRunning ? t.colors.accent : t.colors.textMuted,
            fontSize: t.fontSize.display,
            fontWeight: t.fontWeight.bold,
            fontVariant: ['tabular-nums'],
            letterSpacing: -1,
          }}
        >
          {elapsed}
        </Text>
        <PressableScale
          onPress={onToggle}
          disabled={!canStart}
          scaleTo={0.9}
          accessibilityRole="button"
          accessibilityLabel={isRunning ? 'Stop' : 'Start'}
          style={[
            {
              width: 64,
              height: 64,
              borderRadius: t.radius.pill,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: t.colors.accent,
              opacity: canStart ? 1 : 0.4,
            },
            t.shadow[3],
          ]}
        >
          {isRunning ? (
            <Square size={22} color={t.colors.onAccent} fill={t.colors.onAccent} />
          ) : (
            <Play size={28} color={t.colors.onAccent} fill={t.colors.onAccent} />
          )}
        </PressableScale>
      </View>
    </View>
  );

  if (!isRunning) return card;

  // Running: an opaque wrapper casts a real amber glow *outside* the card (a translucent
  // card can't cast a visible shadow itself), matching the design's `--shadow-glow`.
  return (
    <View
      style={{
        borderRadius: t.radius.lg,
        backgroundColor: t.colors.bg,
        shadowColor: t.colors.accent,
        shadowOpacity: 0.55,
        shadowRadius: 26,
        shadowOffset: { width: 0, height: 8 },
        elevation: 16,
      }}
    >
      {card}
    </View>
  );
}
