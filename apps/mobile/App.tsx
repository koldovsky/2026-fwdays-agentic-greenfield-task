import { ActivityIndicator, View } from 'react-native';
import { AuthProvider, useAuth } from './src/auth/AuthContext';
import { AuthScreen } from './src/screens/AuthScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { ThemeProvider, useTheme } from './src/theme';

// Auth gate: nothing but the auth screen until signed in (FR-AUTH-06, FR-SHELL-02).
function Root() {
  const t = useTheme();
  const { status } = useAuth();

  if (status === 'loading') {
    return (
      <View style={{ flex: 1, backgroundColor: t.colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={t.colors.accent} />
      </View>
    );
  }
  return status === 'signedIn' ? <HomeScreen /> : <AuthScreen />;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Root />
      </AuthProvider>
    </ThemeProvider>
  );
}
