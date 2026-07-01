import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthScreen } from '../screens/AuthScreen';
import { useAuthStore } from '../store/authStore';
import { useTheme } from '../theme';
import { TabNavigator } from './TabNavigator';

const Stack = createNativeStackNavigator();

/**
 * Gated root (FR-SHELL-02): a loading splash while the session restores, then the auth
 * screen when signed out or the tab shell when signed in. Auth state changes swap the
 * tree with no manual reload.
 */
export function RootNavigator() {
  const t = useTheme();
  const status = useAuthStore((s) => s.status);
  const init = useAuthStore((s) => s.init);

  useEffect(() => {
    void init();
  }, [init]);

  if (status === 'loading') {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: t.colors.bg,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ActivityIndicator color={t.colors.accent} />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {status === 'signedIn' ? (
        <Stack.Screen name="App" component={TabNavigator} />
      ) : (
        <Stack.Screen name="Auth" component={AuthScreen} />
      )}
    </Stack.Navigator>
  );
}
