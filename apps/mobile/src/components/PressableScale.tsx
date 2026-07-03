import { useRef } from 'react';
import {
  Animated,
  Pressable,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface PressableScaleProps extends Omit<PressableProps, 'style'> {
  style?: StyleProp<ViewStyle>;
  /** Scale to settle to while pressed (default 0.94). */
  scaleTo?: number;
}

/**
 * A Pressable that eases its scale on press with a spring, so taps feel soft and
 * settled rather than snapping instantly (the design system's calm motion). Reuse for
 * every tappable control instead of a raw `pressed`-driven transform.
 */
export function PressableScale({
  style,
  scaleTo = 0.94,
  onPressIn,
  onPressOut,
  ...rest
}: PressableScaleProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const spring = (toValue: number) =>
    Animated.spring(scale, {
      toValue,
      useNativeDriver: true,
      speed: 30,
      bounciness: 6,
    }).start();

  return (
    <AnimatedPressable
      {...rest}
      onPressIn={(e) => {
        spring(scaleTo);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        spring(1);
        onPressOut?.(e);
      }}
      style={[style, { transform: [{ scale }] }]}
    />
  );
}
