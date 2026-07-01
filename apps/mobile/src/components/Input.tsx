import { forwardRef, type ReactNode, useState } from 'react';
import { Text, TextInput, type TextInputProps, View } from 'react-native';
import { useTheme } from '../theme';

interface InputProps extends TextInputProps {
  label?: string;
  leadingIcon?: ReactNode;
}

/**
 * Honeydo text field: label + filled `surface-alt` row with a leading icon, warming
 * to amber on focus (per the design system Input). Wrap with RHF's Controller.
 */
export const Input = forwardRef<TextInput, InputProps>(function Input(
  { label, leadingIcon, onFocus, onBlur, style, ...rest },
  ref,
) {
  const t = useTheme();
  const [focused, setFocused] = useState(false);

  return (
    <View style={{ gap: t.space[2] }}>
      {label ? (
        <Text
          style={{
            color: t.colors.textMuted,
            fontSize: t.fontSize.subhead,
            fontWeight: t.fontWeight.semibold,
          }}
        >
          {label}
        </Text>
      ) : null}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: t.space[3],
          height: 52,
          paddingHorizontal: t.space[4],
          backgroundColor: t.colors.surfaceAlt,
          borderWidth: 1,
          borderColor: focused ? t.colors.accent : t.colors.border,
          borderRadius: t.radius.md,
        }}
      >
        {leadingIcon}
        <TextInput
          ref={ref}
          placeholderTextColor={t.colors.textMuted}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={[{ flex: 1, color: t.colors.text, fontSize: t.fontSize.body }, style]}
          {...rest}
        />
      </View>
    </View>
  );
});
