import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../components/Button';
import { SegmentedControl } from '../components/SegmentedControl';
import { useAuthStore } from '../store/authStore';
import { type AppearancePreference, useTheme, useThemeControls } from '../theme';

const APPEARANCE_OPTIONS: { value: AppearancePreference; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
];

/** Profile tab: the signed-in user, appearance control, and sign-out. */
export function ProfileScreen() {
  const t = useTheme();
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const { preference, setPreference } = useThemeControls();

  const eyebrow = {
    color: t.colors.textMuted,
    fontSize: t.fontSize.caption,
    fontWeight: t.fontWeight.semibold,
    letterSpacing: 1.2,
  } as const;

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: t.colors.bg }}>
      <View style={{ flex: 1, padding: t.screenGutter, gap: t.space[2] }}>
        <Text style={eyebrow}>PROFILE</Text>
        <Text style={{ color: t.colors.text, fontSize: t.fontSize.largeTitle, fontWeight: t.fontWeight.heavy }}>
          {user?.email ?? 'You'}
        </Text>
        <Text style={{ color: t.colors.textMuted, fontSize: t.fontSize.body, marginTop: t.space[2] }}>
          Signed in with {user?.providers.join(' + ') || 'email'}.
        </Text>

        <View style={{ gap: t.space[3], marginTop: t.space[7] }}>
          <Text style={eyebrow}>APPEARANCE</Text>
          <SegmentedControl
            options={APPEARANCE_OPTIONS}
            value={preference}
            onChange={setPreference}
          />
        </View>

        <View style={{ flex: 1 }} />
        <Button variant="secondary" onPress={() => void signOut()}>
          Sign out
        </Button>
      </View>
    </SafeAreaView>
  );
}
