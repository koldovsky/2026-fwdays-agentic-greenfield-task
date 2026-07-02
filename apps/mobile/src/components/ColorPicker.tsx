import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { Check, Plus } from 'lucide-react-native';
import { KEYBOARD_DONE_ID } from './KeyboardDoneAccessory';
import { PressableScale } from './PressableScale';
import { tagPalette, useTheme } from '../theme';

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
}

/** True for a `#RGB` or `#RRGGBB` hex string. */
function isHex(value: string): boolean {
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value.trim());
}

/**
 * Tag color chooser: the preset palette plus a "custom" swatch that reveals a hex input
 * (FR-TAG-01). Emits the chosen color as a hex string.
 */
export function ColorPicker({ value, onChange }: ColorPickerProps) {
  const t = useTheme();
  const isPreset = (tagPalette as readonly string[]).includes(value);
  const [customOpen, setCustomOpen] = useState(!isPreset);
  const [hex, setHex] = useState(isPreset ? '' : value);

  const applyHex = (next: string) => {
    setHex(next);
    const withHash = next.startsWith('#') ? next : `#${next}`;
    if (isHex(withHash)) onChange(withHash);
  };

  return (
    <View style={{ gap: t.space[3] }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.space[2], alignItems: 'center' }}>
        {tagPalette.map((c) => (
          <Swatch
            key={c}
            color={c}
            selected={!customOpen && value === c}
            onPress={() => {
              setCustomOpen(false);
              onChange(c);
            }}
          />
        ))}

        {/* Custom swatch: shows the current custom color, or a + to open the hex input. */}
        <PressableScale
          onPress={() => setCustomOpen(true)}
          scaleTo={0.85}
          accessibilityRole="button"
          accessibilityLabel="Custom color"
          style={{
            width: 28,
            height: 28,
            borderRadius: t.radius.pill,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 2,
            borderStyle: 'dashed',
            borderColor: customOpen ? t.colors.text : t.colors.border,
          }}
        >
          {customOpen && isHex(hex.startsWith('#') ? hex : `#${hex}`) ? (
            <View style={{ width: 18, height: 18, borderRadius: t.radius.pill, backgroundColor: value }} />
          ) : (
            <Plus size={14} color={t.colors.textMuted} />
          )}
        </PressableScale>
      </View>

      {customOpen ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.space[2] }}>
          <View
            style={{
              width: 24,
              height: 24,
              borderRadius: t.radius.pill,
              borderWidth: 1,
              borderColor: t.colors.border,
              backgroundColor: isHex(hex.startsWith('#') ? hex : `#${hex}`)
                ? hex.startsWith('#')
                  ? hex
                  : `#${hex}`
                : t.colors.surfaceAlt,
            }}
          />
          <TextInput
            value={hex}
            onChangeText={applyHex}
            placeholder="#RRGGBB"
            placeholderTextColor={t.colors.textMuted}
            autoCapitalize="characters"
            autoCorrect={false}
            spellCheck={false}
            maxLength={7}
            inputAccessoryViewID={KEYBOARD_DONE_ID}
            style={{
              flex: 1,
              color: t.colors.text,
              fontSize: t.fontSize.body,
              paddingVertical: t.space[2],
              paddingHorizontal: t.space[3],
              borderRadius: t.radius.sm,
              backgroundColor: t.colors.surfaceAlt,
            }}
          />
          {isHex(hex.startsWith('#') ? hex : `#${hex}`) ? (
            <Check size={18} color={t.colors.success} />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function Swatch({
  color,
  selected,
  onPress,
}: {
  color: string;
  selected: boolean;
  onPress: () => void;
}) {
  const t = useTheme();
  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.85}
      accessibilityRole="button"
      accessibilityLabel={`Color ${color}`}
      style={{
        width: 28,
        height: 28,
        borderRadius: t.radius.pill,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: selected ? t.colors.text : 'transparent',
      }}
    >
      <View style={{ width: 20, height: 20, borderRadius: t.radius.pill, backgroundColor: color }} />
    </PressableScale>
  );
}
