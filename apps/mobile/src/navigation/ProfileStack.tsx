import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ManageTagsScreen } from '../screens/ManageTagsScreen';
import { ProfileScreen } from '../screens/ProfileScreen';

export type ProfileStackParamList = {
  ProfileHome: undefined;
  ManageTags: undefined;
};

const Stack = createNativeStackNavigator<ProfileStackParamList>();

/**
 * The Profile tab as a native-stack so settings rows can push (e.g. "Manage tags").
 * Both screens render their own in-screen header, so the native header stays hidden
 * (avoids the platform's header-button chrome around a custom back control).
 */
export function ProfileStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ProfileHome" component={ProfileScreen} />
      <Stack.Screen name="ManageTags" component={ManageTagsScreen} />
    </Stack.Navigator>
  );
}
