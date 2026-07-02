import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChevronRight, Tag as TagIcon } from 'lucide-react-native';
import { Button } from '../components/Button';
import { PressableScale } from '../components/PressableScale';
import { SegmentedControl } from '../components/SegmentedControl';
import type { ProfileStackParamList } from '../navigation/ProfileStack';
import { useAuthStore } from '../store/authStore';
import {
  type AppearancePreference,
  tagPalette,
  useTheme,
  useThemeControls,
} from '../theme';

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
  const navigation =
    useNavigation<NativeStackNavigationProp<ProfileStackParamList>>();

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
          {user?.name || user?.email || 'You'}
        </Text>
        <Text style={{ color: t.colors.textMuted, fontSize: t.fontSize.body, marginTop: t.space[2] }}>
          {user?.name ? `${user.email} · ` : ''}Signed in with {user?.providers.join(' + ') || 'email'}.
        </Text>

        <View style={{ gap: t.space[3], marginTop: t.space[7] }}>
          <Text style={eyebrow}>APPEARANCE</Text>
          <SegmentedControl
            options={APPEARANCE_OPTIONS}
            value={preference}
            onChange={setPreference}
          />
        </View>

        <View style={{ gap: t.space[3], marginTop: t.space[6] }}>
          <Text style={eyebrow}>TAGS</Text>
          <View
            style={{
              borderRadius: t.radius.md,
              borderWidth: 1,
              borderColor: t.colors.border,
              backgroundColor: t.colors.surface,
              overflow: 'hidden',
            }}
          >
            <PressableScale
              onPress={() => navigation.navigate('ManageTags')}
              accessibilityRole="button"
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: t.space[3],
                paddingVertical: t.space[3],
                paddingHorizontal: t.space[4],
              }}
            >
              <View
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: t.radius.xs,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: tagPalette[2],
                }}
              >
                <TagIcon size={17} color={t.colors.onColor} />
              </View>
              <Text style={{ flex: 1, color: t.colors.text, fontSize: t.fontSize.callout, fontWeight: t.fontWeight.medium }}>
                Manage tags
              </Text>
              <ChevronRight size={18} color={t.colors.textMuted} />
            </PressableScale>
          </View>
        </View>

        <View style={{ flex: 1 }} />
        <Button variant="secondary" destructive onPress={() => void signOut()}>
          Sign out
        </Button>
      </View>
    </SafeAreaView>
  );
}
