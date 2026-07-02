import {
  DarkTheme,
  DefaultTheme,
  NavigationContainer,
  type Theme as NavTheme,
} from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  initialWindowMetrics,
  SafeAreaProvider,
} from 'react-native-safe-area-context';
import { KeyboardDoneAccessory } from './src/components/KeyboardDoneAccessory';
import { RootNavigator } from './src/navigation/RootNavigator';
import { ThemeProvider, useTheme } from './src/theme';

// One client for the app's server-state (time entries). Entries change through the
// user's own actions, so refetch-on-focus is off; mutations invalidate explicitly.
const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false, staleTime: 30_000 } },
});

// Bridge the Honeydo background into React Navigation so there's no white flash on swap.
function NavRoot() {
  const t = useTheme();
  const base = t.scheme === 'dark' ? DarkTheme : DefaultTheme;
  const navTheme: NavTheme = {
    ...base,
    colors: { ...base.colors, background: t.colors.bg },
  };
  return (
    <NavigationContainer theme={navTheme}>
      <RootNavigator />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    // initialMetrics provides safe-area insets synchronously on first render, so a
    // freshly focused tab doesn't jump from 0 → real inset the first time it shows.
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <NavRoot />
          <KeyboardDoneAccessory />
        </QueryClientProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
