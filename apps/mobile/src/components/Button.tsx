import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useTheme } from '../theme';

type Variant = 'primary' | 'secondary';
type Size = 'md' | 'lg';

interface ButtonProps {
  children: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  disabled?: boolean;
  loading?: boolean;
  leadingIcon?: ReactNode;
}

/**
 * Honeydo action button: pill-shaped, honey-amber primary / bordered secondary, with a
 * calm press settle (soft scale-down). One primary action per screen.
 */
export function Button({
  children,
  onPress,
  variant = 'primary',
  size = 'lg',
  disabled = false,
  loading = false,
  leadingIcon,
}: ButtonProps) {
  const t = useTheme();
  const height = size === 'lg' ? 56 : 48;
  const fontSize = size === 'lg' ? t.fontSize.headline : t.fontSize.callout;

  const isPrimary = variant === 'primary';
  const bg = isPrimary ? t.colors.accent : t.colors.surface;
  const fg = isPrimary ? t.colors.onAccent : t.colors.text;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: t.space[2],
          height,
          borderRadius: t.radius.pill,
          backgroundColor: bg,
          borderWidth: 1,
          borderColor: isPrimary ? 'transparent' : t.colors.border,
          opacity: disabled ? 0.45 : 1,
          transform: [{ scale: pressed ? 0.96 : 1 }],
        },
        isPrimary ? t.shadow[2] : null,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {leadingIcon ? <View>{leadingIcon}</View> : null}
          <Text style={{ color: fg, fontSize, fontWeight: t.fontWeight.bold }}>
            {children}
          </Text>
        </>
      )}
    </Pressable>
  );
}
