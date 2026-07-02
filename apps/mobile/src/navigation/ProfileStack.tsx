import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ChevronLeft } from 'lucide-react-native';
import { PressableScale } from '../components/PressableScale';
import { ManageTagsScreen } from '../screens/ManageTagsScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { useTheme } from '../theme';

export type ProfileStackParamList = {
  ProfileHome: undefined;
  ManageTags: undefined;
};

const Stack = createNativeStackNavigator<ProfileStackParamList>();

/**
 * The Profile tab as a native-stack so settings rows can push (e.g. "Manage tags").
 * Profile itself keeps its own in-screen header; pushed screens get a themed nav bar.
 */
export function ProfileStack() {
  const t = useTheme();
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="ProfileHome"
        component={ProfileScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ManageTags"
        component={ManageTagsScreen}
        options={({ navigation }) => ({
          title: 'Manage tags',
          headerStyle: { backgroundColor: t.colors.bg },
          headerShadowVisible: false,
          headerTitleStyle: { color: t.colors.text },
          // A bare chevron back — no default button chrome, label, or border.
          headerLeft: () => (
            <PressableScale
              onPress={() => navigation.goBack()}
              accessibilityRole="button"
              accessibilityLabel="Back"
              hitSlop={12}
              style={{ paddingRight: t.space[3], paddingVertical: t.space[1] }}
            >
              <ChevronLeft size={26} color={t.colors.accent} />
            </PressableScale>
          ),
        })}
      />
    </Stack.Navigator>
  );
}
