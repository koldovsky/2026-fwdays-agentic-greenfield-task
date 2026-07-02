import { Pressable, Text, View } from 'react-native';
import { Play, Square } from 'lucide-react-native';
import type { TimeEntry } from '@honeydo/shared';
import { formatDurationHms } from '@honeydo/shared';
import { useElapsed } from '../hooks/useElapsed';
import { useTheme } from '../theme';

interface TimerEntryProps {
  entry: TimeEntry;
  /** Continue a stopped entry (starts a fresh running copy). */
  onContinue?: (entry: TimeEntry) => void;
  /** Stop the running entry. */
  onStop?: (entry: TimeEntry) => void;
  /** Open the entry for editing. */
  onPress?: (entry: TimeEntry) => void;
}

/**
 * A single time-entry row (per the design system `TimerEntry`): description + duration
 * with a round quick-action. A running entry glows amber, shows a live elapsed clock,
 * and its action becomes Stop.
 */
export function TimerEntry({ entry, onContinue, onStop, onPress }: TimerEntryProps) {
  const t = useTheme();
  const running = entry.stoppedAt === null;
  const liveElapsed = useElapsed(entry.startedAt, running);
  const duration = running ? liveElapsed : formatDurationHms(entry.durationSec ?? 0);

  return (
    <Pressable
      onPress={onPress ? () => onPress(entry) : undefined}
      accessibilityRole="button"
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: t.space[3],
          paddingVertical: t.space[3],
          paddingHorizontal: t.space[4],
          backgroundColor: running ? t.colors.accentFaint : t.colors.surface,
          borderWidth: 1,
          borderColor: running ? t.colors.accentSoft : t.colors.border,
          borderRadius: t.radius.md,
          opacity: pressed && onPress ? 0.85 : 1,
        },
        running ? t.shadow[2] : t.shadow[1],
      ]}
    >
      <View style={{ flex: 1, minWidth: 0, gap: t.space[1] }}>
        <Text
          numberOfLines={1}
          style={{
            color: t.colors.text,
            fontSize: t.fontSize.callout,
            fontWeight: t.fontWeight.semibold,
          }}
        >
          {entry.note}
        </Text>
      </View>

      <Text
        style={{
          color: running ? t.colors.accent : t.colors.text,
          fontSize: 19,
          fontWeight: t.fontWeight.bold,
          fontVariant: ['tabular-nums'],
          letterSpacing: -0.5,
        }}
      >
        {duration}
      </Text>

      <Pressable
        onPress={() =>
          running ? onStop?.(entry) : onContinue?.(entry)
        }
        accessibilityRole="button"
        accessibilityLabel={running ? 'Stop timer' : 'Continue this entry'}
        style={({ pressed }) => ({
          width: 40,
          height: 40,
          borderRadius: t.radius.pill,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: running ? t.colors.accent : t.colors.fillSoft,
          transform: [{ scale: pressed ? 0.9 : 1 }],
        })}
      >
        {running ? (
          <Square size={15} color={t.colors.onAccent} fill={t.colors.onAccent} />
        ) : (
          <Play size={17} color={t.colors.accent} fill={t.colors.accent} />
        )}
      </Pressable>
    </Pressable>
  );
}
