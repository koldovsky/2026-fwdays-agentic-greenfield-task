import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ProfileScreen } from '../screens/ProfileScreen';
import { StatsScreen } from '../screens/StatsScreen';
import { TimerHistoryScreen } from '../screens/TimerHistoryScreen';
import { TabBar } from './TabBar';

const Tab = createBottomTabNavigator();

/** The signed-in app: three tabs with the design system tab bar (FR-SHELL-01). */
export function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <TabBar {...props} />}
    >
      <Tab.Screen name="TimerHistory" component={TimerHistoryScreen} options={{ title: 'Timer' }} />
      <Tab.Screen name="Stats" component={StatsScreen} options={{ title: 'Stats' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile' }} />
    </Tab.Navigator>
  );
}
