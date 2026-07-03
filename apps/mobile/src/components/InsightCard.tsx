import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { RefreshCw, Sparkles } from 'lucide-react-native';
import { useTheme } from '../theme';

interface InsightCardProps {
  /** The insight sentence; undefined while first loading. */
  text?: string;
  isLoading: boolean;
  isError: boolean;
  isRefreshing: boolean;
  onRefresh: () => void;
}

/**
 * The daily-insight card on Stats (FR-INSIGHT-01). Calm loading state, and since the server
 * always degrades to a deterministic fallback (FR-INSIGHT-06), the client rarely shows a hard
 * error — a quiet retry line covers the network-down case. Tokens only (FR-THEME-03).
 */
export function InsightCard({
  text,
  isLoading,
  isError,
  isRefreshing,
  onRefresh,
}: InsightCardProps) {
  const t = useTheme();
  const busy = isLoading || isRefreshing;
  const showError = isError && !text;

  return (
    <View
      style={{
        backgroundColor: t.colors.surface,
        borderWidth: 1,
        borderColor: t.colors.border,
        borderRadius: t.radius.md,
        borderCurve: 'continuous',
        padding: t.space[4],
        gap: t.space[3],
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.space[2] }}>
          <Sparkles size={16} color={t.colors.accent} />
          <Text
            style={{
              color: t.colors.accent,
              fontSize: t.fontSize.footnote,
              fontWeight: t.fontWeight.bold,
              letterSpacing: 0.5,
            }}
          >
            TODAY
          </Text>
        </View>
        <Pressable
          onPress={onRefresh}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel="Refresh insight"
          hitSlop={8}
          style={{ opacity: busy ? 0.4 : 1 }}
        >
          <RefreshCw size={16} color={t.colors.textMuted} />
        </Pressable>
      </View>

      {isLoading ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.space[2] }}>
          <ActivityIndicator color={t.colors.accent} />
          <Text style={{ color: t.colors.textMuted, fontSize: t.fontSize.callout }}>
            Reading your week…
          </Text>
        </View>
      ) : (
        <Text
          style={{
            color: showError ? t.colors.textMuted : t.colors.text,
            fontSize: t.fontSize.headline,
            lineHeight: t.fontSize.headline * t.lineHeight.relaxed,
            fontWeight: t.fontWeight.semibold,
          }}
        >
          {text ??
            (showError
              ? "Couldn't reach your insight just now — tap refresh to try again."
              : 'Track some time and your daily insight will appear here.')}
        </Text>
      )}
    </View>
  );
}
