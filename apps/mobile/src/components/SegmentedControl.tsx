import { Pressable, Text, View } from 'react-native';
import { useTheme } from '../theme';

interface Option<T extends string> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string> {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
}

/**
 * Honeydo segmented control (per the design system): a soft pill track with the active
 * segment lifted onto a `surface` chip. Token-driven; reusable for any small multi-choice.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  const t = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        gap: 2,
        padding: 3,
        backgroundColor: t.colors.fillSoft,
        borderRadius: t.radius.sm,
      }}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            accessibilityRole="button"
            accessibilityState={active ? { selected: true } : {}}
            style={[
              {
                flex: 1,
                alignItems: 'center',
                paddingVertical: t.space[2],
                borderRadius: t.radius.sm - 3,
                backgroundColor: active ? t.colors.surface : 'transparent',
              },
              active ? t.shadow[1] : null,
            ]}
          >
            <Text
              style={{
                color: active ? t.colors.text : t.colors.textMuted,
                fontSize: t.fontSize.subhead,
                fontWeight: t.fontWeight.semibold,
              }}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
