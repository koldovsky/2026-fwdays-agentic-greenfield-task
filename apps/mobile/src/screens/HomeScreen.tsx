import { Pressable, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../auth/AuthContext';
import { useTheme } from '../theme';

/** Placeholder signed-in screen. The real tabbed shell arrives with app-shell. */
export function HomeScreen() {
  const t = useTheme();
  const { user, signOut } = useAuth();

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.bg, padding: t.screenGutter, justifyContent: 'center', gap: t.space[3] }}>
      <Text style={{ color: t.colors.textMuted, fontSize: t.fontSize.caption, fontWeight: t.fontWeight.semibold, letterSpacing: 1.2 }}>
        TODAY
      </Text>
      <Text style={{ color: t.colors.text, fontSize: t.fontSize.largeTitle, fontWeight: t.fontWeight.heavy }}>
        Your hive is empty
      </Text>
      <Text style={{ color: t.colors.textMuted, fontSize: t.fontSize.body }}>
        Signed in as {user?.email}.
      </Text>

      <Pressable
        onPress={() => void signOut()}
        style={{
          marginTop: t.space[4],
          alignSelf: 'flex-start',
          borderColor: t.colors.border,
          borderWidth: 1,
          borderRadius: t.radius.pill,
          paddingHorizontal: t.space[5],
          paddingVertical: t.space[3],
        }}
      >
        <Text style={{ color: t.colors.text, fontSize: t.fontSize.subhead, fontWeight: t.fontWeight.semibold }}>
          Sign out
        </Text>
      </Pressable>

      <StatusBar style={t.scheme === 'dark' ? 'light' : 'dark'} />
    </View>
  );
}
