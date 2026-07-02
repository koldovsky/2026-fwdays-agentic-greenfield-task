import { createNativeStackNavigator } from '@react-navigation/native-stack';
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
        options={{
          title: 'Manage tags',
          headerStyle: { backgroundColor: t.colors.bg },
          headerTintColor: t.colors.accent,
          headerTitleStyle: { color: t.colors.text },
        }}
      />
    </Stack.Navigator>
  );
}
