import { Pressable, Text } from 'react-native';
import { useTheme } from '../theme';

/**
 * A tappable inline text link — accent-colored so it reads as actionable (the amber
 * already signals it; no underline). Reuse for all "link"-style text buttons.
 */
export function TextLink({
  children,
  onPress,
}: {
  children: string;
  onPress: () => void;
}) {
  const t = useTheme();
  return (
    <Pressable onPress={onPress} hitSlop={8}>
      {({ pressed }) => (
        <Text
          style={{
            color: t.colors.accent,
            fontSize: t.fontSize.subhead,
            fontWeight: t.fontWeight.semibold,
            opacity: pressed ? 0.6 : 1,
          }}
        >
          {children}
        </Text>
      )}
    </Pressable>
  );
}
