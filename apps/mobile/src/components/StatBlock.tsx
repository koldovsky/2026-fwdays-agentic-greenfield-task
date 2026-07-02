import { Text, View } from 'react-native';
import { useTheme } from '../theme';

interface StatBlockProps {
  /** Pre-formatted value (e.g. "6.2", "31"). */
  value: string;
  /** Unit suffix rendered smaller beside the value (e.g. "h"). */
  unit: string;
  label: string;
  /** Emphasize the value in the accent color (used for "Today"). */
  accent?: boolean;
}

/** One of the three Today / This week / All time totals cards (FR-STATS-03). */
export function StatBlock({ value, unit, label, accent }: StatBlockProps) {
  const t = useTheme();
  return (
    <View
      style={{
        flex: 1,
        paddingVertical: t.space[3],
        paddingHorizontal: t.space[2],
        backgroundColor: t.colors.surface,
        borderWidth: 1,
        borderColor: t.colors.border,
        borderRadius: t.radius.md,
        borderCurve: 'continuous',
        alignItems: 'center',
      }}
    >
      <Text>
        <Text
          style={{
            fontSize: t.fontSize.title2,
            fontWeight: t.fontWeight.heavy,
            color: accent ? t.colors.accent : t.colors.text,
          }}
        >
          {value}
        </Text>
        <Text
          style={{
            fontSize: t.fontSize.subhead,
            fontWeight: t.fontWeight.bold,
            color: t.colors.textMuted,
          }}
        >
          {unit}
        </Text>
      </Text>
      <Text
        style={{
          fontSize: t.fontSize.caption,
          color: t.colors.textMuted,
          fontWeight: t.fontWeight.semibold,
          marginTop: t.space[1],
        }}
      >
        {label}
      </Text>
    </View>
  );
}
