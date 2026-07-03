import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { HistoryScreen } from '../screens/HistoryScreen';
import { StatsScreen } from '../screens/StatsScreen';
import { TimerScreen } from '../screens/TimerScreen';
import { useTheme } from '../theme';
import { ProfileStack } from './ProfileStack';
import { TabBar } from './TabBar';

const Tab = createBottomTabNavigator();

/** The signed-in app: four tabs with the design system tab bar (FR-SHELL-01). */
export function TabNavigator() {
  const t = useTheme();
  return (
    <Tab.Navigator
      // Keep inactive tabs mounted AND attached so switching doesn't blank a frame
      // (the blink) while a screen re-attaches.
      detachInactiveScreens={false}
      screenOptions={{
        headerShown: false,
        // Pre-mount every tab, don't freeze it, and give the scene an opaque bg so the
        // switch is instant with no flash of the previous screen.
        lazy: false,
        freezeOnBlur: false,
        animation: 'none',
        sceneStyle: { backgroundColor: t.colors.bg },
      }}
      tabBar={(props) => <TabBar {...props} />}
    >
      <Tab.Screen name="Timer" component={TimerScreen} options={{ title: 'Timer' }} />
      <Tab.Screen name="History" component={HistoryScreen} options={{ title: 'History' }} />
      <Tab.Screen name="Stats" component={StatsScreen} options={{ title: 'Stats' }} />
      <Tab.Screen name="Profile" component={ProfileStack} options={{ title: 'Profile' }} />
    </Tab.Navigator>
  );
}
