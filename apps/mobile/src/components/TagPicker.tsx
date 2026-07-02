import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { Check, Plus } from 'lucide-react-native';
import { useCreateTag, useTags } from '../hooks/useTags';
import { tagPalette, useTheme } from '../theme';
import { KEYBOARD_DONE_ID } from './KeyboardDoneAccessory';
import { PressableScale } from './PressableScale';

interface TagPickerProps {
  /** Selected tag ids. */
  value: string[];
  onChange: (tagIds: string[]) => void;
}

/**
 * Multi-select tag chips (colored dot + name) with an inline "create tag" (name + a color
 * from the preset palette). Reads the user's tags via `useTags`; token-driven.
 */
export function TagPicker({ value, onChange }: TagPickerProps) {
  const t = useTheme();
  const { data: tags = [] } = useTags();
  const createTag = useCreateTag();

  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [color, setColor] = useState<string>(tagPalette[0]);

  const toggle = (id: string) => {
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  };

  const submitNew = () => {
    const trimmed = name.trim();
    if (!trimmed || createTag.isPending) return;
    createTag.mutate(
      { name: trimmed, color },
      {
        onSuccess: (tag) => {
          onChange([...value, tag.id]);
          setName('');
          setColor(tagPalette[0]);
          setCreating(false);
        },
      },
    );
  };

  return (
    <View style={{ gap: t.space[2] }}>
      <Text style={{ color: t.colors.textMuted, fontSize: t.fontSize.footnote, fontWeight: t.fontWeight.bold, letterSpacing: 1 }}>
        TAGS
      </Text>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.space[2] }}>
        {tags.map((tag) => {
          const selected = value.includes(tag.id);
          return (
            <PressableScale
              key={tag.id}
              onPress={() => toggle(tag.id)}
              scaleTo={0.92}
              accessibilityRole="button"
              accessibilityState={selected ? { selected: true } : {}}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: t.space[2],
                paddingVertical: t.space[2],
                paddingHorizontal: t.space[3],
                borderRadius: t.radius.pill,
                borderWidth: 1,
                borderColor: selected ? t.colors.accent : t.colors.border,
                backgroundColor: selected ? t.colors.accentFaint : t.colors.surface,
              }}
            >
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: t.radius.pill,
                  backgroundColor: tag.color ?? t.colors.textMuted,
                }}
              />
              <Text style={{ color: t.colors.text, fontSize: t.fontSize.subhead, fontWeight: t.fontWeight.medium }}>
                {tag.name}
              </Text>
              {selected ? <Check size={14} color={t.colors.accent} /> : null}
            </PressableScale>
          );
        })}

        {!creating ? (
          <PressableScale
            onPress={() => setCreating(true)}
            scaleTo={0.92}
            accessibilityRole="button"
            accessibilityLabel="Create a tag"
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: t.space[1],
              paddingVertical: t.space[2],
              paddingHorizontal: t.space[3],
              borderRadius: t.radius.pill,
              borderWidth: 1,
              borderColor: t.colors.border,
              borderStyle: 'dashed',
            }}
          >
            <Plus size={14} color={t.colors.accent} />
            <Text style={{ color: t.colors.accent, fontSize: t.fontSize.subhead, fontWeight: t.fontWeight.semibold }}>
              New
            </Text>
          </PressableScale>
        ) : null}
      </View>

      {creating ? (
        <View
          style={{
            gap: t.space[3],
            padding: t.space[3],
            borderRadius: t.radius.md,
            borderWidth: 1,
            borderColor: t.colors.border,
            backgroundColor: t.colors.surface,
          }}
        >
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Tag name"
            placeholderTextColor={t.colors.textMuted}
            autoFocus
            autoCorrect={false}
            spellCheck={false}
            inputAccessoryViewID={KEYBOARD_DONE_ID}
            onSubmitEditing={submitNew}
            returnKeyType="done"
            style={{
              color: t.colors.text,
              fontSize: t.fontSize.body,
              paddingVertical: t.space[2],
              paddingHorizontal: t.space[3],
              borderRadius: t.radius.sm,
              backgroundColor: t.colors.surfaceAlt,
            }}
          />
          <View style={{ flexDirection: 'row', gap: t.space[2], alignItems: 'center' }}>
            {tagPalette.map((c) => (
              <PressableScale
                key={c}
                onPress={() => setColor(c)}
                scaleTo={0.85}
                accessibilityRole="button"
                accessibilityLabel={`Color ${c}`}
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: t.radius.pill,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 2,
                  borderColor: color === c ? t.colors.text : 'transparent',
                }}
              >
                <View style={{ width: 18, height: 18, borderRadius: t.radius.pill, backgroundColor: c }} />
              </PressableScale>
            ))}
          </View>
          <View style={{ flexDirection: 'row', gap: t.space[2] }}>
            <PressableScale
              onPress={submitNew}
              accessibilityRole="button"
              style={{
                flex: 1,
                alignItems: 'center',
                paddingVertical: t.space[2],
                borderRadius: t.radius.pill,
                backgroundColor: t.colors.accent,
                opacity: name.trim() && !createTag.isPending ? 1 : 0.4,
              }}
            >
              <Text style={{ color: t.colors.onAccent, fontSize: t.fontSize.subhead, fontWeight: t.fontWeight.bold }}>
                Create
              </Text>
            </PressableScale>
            <PressableScale
              onPress={() => {
                setCreating(false);
                setName('');
              }}
              accessibilityRole="button"
              style={{
                paddingVertical: t.space[2],
                paddingHorizontal: t.space[4],
                borderRadius: t.radius.pill,
                borderWidth: 1,
                borderColor: t.colors.border,
              }}
            >
              <Text style={{ color: t.colors.textMuted, fontSize: t.fontSize.subhead, fontWeight: t.fontWeight.semibold }}>
                Cancel
              </Text>
            </PressableScale>
          </View>
        </View>
      ) : null}
    </View>
  );
}
