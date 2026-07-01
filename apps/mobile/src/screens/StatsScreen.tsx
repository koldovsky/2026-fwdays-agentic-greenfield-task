import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme';

/** Stats tab placeholder. Weekly chart + totals arrive with the `profile-stats` capability. */
export function StatsScreen() {
  const t = useTheme();
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: t.colors.bg }}>
      <View style={{ flex: 1, padding: t.screenGutter, gap: t.space[2] }}>
        <Text style={{ color: t.colors.textMuted, fontSize: t.fontSize.caption, fontWeight: t.fontWeight.semibold, letterSpacing: 1.2 }}>
          THIS WEEK
        </Text>
        <Text style={{ color: t.colors.text, fontSize: t.fontSize.largeTitle, fontWeight: t.fontWeight.heavy }}>
          Stats
        </Text>
        <Text style={{ color: t.colors.textMuted, fontSize: t.fontSize.body, marginTop: t.space[2] }}>
          Your weekly hours and top tags will show up here.
        </Text>
      </View>
    </SafeAreaView>
  );
}
