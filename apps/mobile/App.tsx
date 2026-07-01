import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { AuthScreen } from './src/screens/AuthScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { useAuthStore } from './src/store/authStore';
import { ThemeProvider, useTheme } from './src/theme';

// Auth gate: nothing but the auth screen until signed in (FR-AUTH-06, FR-SHELL-02).
function Root() {
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
  return status === 'signedIn' ? <HomeScreen /> : <AuthScreen />;
}

export default function App() {
  return (
    <ThemeProvider>
      <Root />
    </ThemeProvider>
  );
}
