import { Pressable, Text } from 'react-native';
import { useTheme } from '../theme';

/**
 * A tappable inline text link — accent-colored + underlined so it reads as actionable.
 * Reuse for all "link"-style text buttons (e.g. the auth mode toggle).
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
            textDecorationLine: 'underline',
            opacity: pressed ? 0.6 : 1,
          }}
        >
          {children}
        </Text>
      )}
    </Pressable>
  );
}
