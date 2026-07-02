import { ScrollView, Text, View } from 'react-native';
import type { Tag } from '@honeydo/shared';
import { useTheme } from '../theme';
import { PressableScale } from './PressableScale';

interface FilterChipsProps {
  tags: Tag[];
  /** Selected tag ids ([] = All). */
  selected: string[];
  onChange: (tagIds: string[]) => void;
}

/**
 * Horizontal tag filter row for History (per the design `FilterChip`): an "All" chip plus
 * one chip per tag (colored dot). Multi-select; picking "All" clears the selection.
 */
export function FilterChips({ tags, selected, onChange }: FilterChipsProps) {
  const t = useTheme();
  if (tags.length === 0) return null;

  const toggle = (id: string) =>
    onChange(selected.includes(id) ? selected.filter((v) => v !== id) : [...selected, id]);

  const chip = (
    key: string,
    label: string,
    active: boolean,
    onPress: () => void,
    dotColor?: string | null,
  ) => (
    <PressableScale
      key={key}
      onPress={onPress}
      scaleTo={0.95}
      accessibilityRole="button"
      accessibilityState={active ? { selected: true } : {}}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 7,
        height: 34,
        paddingHorizontal: t.space[4],
        borderRadius: t.radius.pill,
        // Design FilterChip: solid amber when selected, soft fill otherwise.
        backgroundColor: active ? t.colors.accent : t.colors.fillSoft,
      }}
    >
      {dotColor !== undefined ? (
        <View
          style={{
            width: 8,
            height: 8,
            borderRadius: t.radius.pill,
            backgroundColor: active ? t.colors.onAccent : (dotColor ?? t.colors.textMuted),
          }}
        />
      ) : null}
      <Text
        style={{
          color: active ? t.colors.onAccent : t.colors.text,
          fontSize: t.fontSize.subhead,
          fontWeight: t.fontWeight.semibold,
        }}
      >
        {label}
      </Text>
    </PressableScale>
  );

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      style={{ flexGrow: 0, maxHeight: 34 + t.space[4] }}
      contentContainerStyle={{
        gap: t.space[2],
        paddingHorizontal: t.screenGutter,
        paddingVertical: t.space[2],
        alignItems: 'center',
      }}
    >
      {chip('all', 'All', selected.length === 0, () => onChange([]))}
      {tags.map((tag) =>
        chip(tag.id, tag.name, selected.includes(tag.id), () => toggle(tag.id), tag.color),
      )}
    </ScrollView>
  );
}
