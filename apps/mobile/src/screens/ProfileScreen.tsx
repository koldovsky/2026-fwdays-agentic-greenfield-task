import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../components/Button';
import { useAuthStore } from '../store/authStore';
import { useTheme } from '../theme';

/** Profile tab: the signed-in user + sign-out. Avatar/streak arrive with later capabilities. */
export function ProfileScreen() {
  const t = useTheme();
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: t.colors.bg }}>
      <View style={{ flex: 1, padding: t.screenGutter, gap: t.space[2] }}>
        <Text style={{ color: t.colors.textMuted, fontSize: t.fontSize.caption, fontWeight: t.fontWeight.semibold, letterSpacing: 1.2 }}>
          PROFILE
        </Text>
        <Text style={{ color: t.colors.text, fontSize: t.fontSize.largeTitle, fontWeight: t.fontWeight.heavy }}>
          {user?.email ?? 'You'}
        </Text>
        <Text style={{ color: t.colors.textMuted, fontSize: t.fontSize.body, marginTop: t.space[2] }}>
          Signed in with {user?.providers.join(' + ') || 'email'}.
        </Text>

        <View style={{ flex: 1 }} />
        <Button variant="secondary" onPress={() => void signOut()}>
          Sign out
        </Button>
      </View>
    </SafeAreaView>
  );
}
