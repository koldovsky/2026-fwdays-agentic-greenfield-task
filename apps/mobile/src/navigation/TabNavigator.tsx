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
      screenOptions={{
        headerShown: false,
        // Pre-mount every tab and give the scene an opaque bg so the first switch
        // doesn't flash the previous screen while a tab lazily mounts.
        lazy: false,
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
