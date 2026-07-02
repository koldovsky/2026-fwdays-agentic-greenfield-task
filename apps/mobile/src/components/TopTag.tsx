import { Text, View } from 'react-native';
import { formatDurationCompact } from '@honeydo/shared';
import { useTheme } from '../theme';

interface TopTagProps {
  name: string;
  /** The tag's dot color, or null for a neutral dot. */
  color: string | null;
  totalSec: number;
  /** The largest total in the list, for the proportional bar width. */
  maxSec: number;
}

/** One row of the per-tag breakdown: dot + name + proportional bar + total (FR-STATS-04). */
export function TopTag({ name, color, totalSec, maxSec }: TopTagProps) {
  const t = useTheme();
  const dot = color ?? t.colors.textMuted;
  const pct = maxSec > 0 ? Math.max((totalSec / maxSec) * 100, 2) : 0;
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: t.space[3],
        paddingVertical: t.space[2],
      }}
    >
      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: dot }} />
      <Text
        numberOfLines={1}
        style={{
          width: 92,
          color: t.colors.text,
          fontSize: t.fontSize.subhead,
          fontWeight: t.fontWeight.semibold,
        }}
      >
        {name}
      </Text>
      <View
        style={{
          flex: 1,
          height: 8,
          backgroundColor: t.colors.surfaceAlt,
          borderRadius: 4,
          overflow: 'hidden',
        }}
      >
        <View style={{ height: '100%', width: `${pct}%`, backgroundColor: dot, borderRadius: 4 }} />
      </View>
      <Text
        style={{
          width: 56,
          textAlign: 'right',
          color: t.colors.textMuted,
          fontSize: t.fontSize.footnote,
          fontWeight: t.fontWeight.bold,
        }}
      >
        {formatDurationCompact(totalSec)}
      </Text>
    </View>
  );
}
