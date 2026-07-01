import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme';

/** History tab placeholder. Day-grouped entries arrive with the `time-entries` capability. */
export function HistoryScreen() {
  const t = useTheme();
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: t.colors.bg }}>
      <View style={{ flex: 1, padding: t.screenGutter, gap: t.space[2] }}>
        <Text style={{ color: t.colors.textMuted, fontSize: t.fontSize.caption, fontWeight: t.fontWeight.semibold, letterSpacing: 1.2 }}>
          HISTORY
        </Text>
        <Text style={{ color: t.colors.text, fontSize: t.fontSize.largeTitle, fontWeight: t.fontWeight.heavy }}>
          Your days
        </Text>
        <Text style={{ color: t.colors.textMuted, fontSize: t.fontSize.body, marginTop: t.space[2] }}>
          Your tracked entries, grouped by day, will show up here.
        </Text>
      </View>
    </SafeAreaView>
  );
}
