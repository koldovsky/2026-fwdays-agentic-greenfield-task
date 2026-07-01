import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import { BarChart3, Timer, User, type LucideIcon } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme';

const ICONS: Record<string, LucideIcon> = {
  TimerHistory: Timer,
  Stats: BarChart3,
  Profile: User,
};

/**
 * Design-system bottom tab bar (honeydo TabBar): translucent blurred surface, warm
 * hairline top border, amber active tab with a subtle icon lift.
 */
export function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const t = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <BlurView
      intensity={40}
      tint={t.scheme === 'dark' ? 'dark' : 'light'}
      style={{
        flexDirection: 'row',
        paddingTop: t.space[2],
        paddingBottom: insets.bottom || t.space[3],
        backgroundColor: t.colors.fillFaint,
        borderTopWidth: 1,
        borderTopColor: t.colors.border,
      }}
    >
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const label = options.title ?? route.name;
        const focused = state.index === index;
        const Icon = ICONS[route.name] ?? Timer;
        const color = focused ? t.colors.accent : t.colors.textMuted;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!focused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            accessibilityRole="button"
            accessibilityState={focused ? { selected: true } : {}}
            accessibilityLabel={label}
            style={{ flex: 1, alignItems: 'center', gap: 3, paddingVertical: t.space[1] }}
          >
            <View style={{ transform: [{ scale: focused ? 1.06 : 1 }] }}>
              <Icon size={24} color={color} />
            </View>
            <Text
              style={{
                color,
                fontSize: 11,
                fontWeight: focused ? t.fontWeight.bold : t.fontWeight.medium,
              }}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </BlurView>
  );
}
