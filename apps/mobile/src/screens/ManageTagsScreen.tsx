import { useState } from 'react';
import { Alert, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Check, ChevronLeft, Pencil, Plus, Trash2 } from 'lucide-react-native';
import type { Tag } from '@honeydo/shared';
import { Button } from '../components/Button';
import { ColorPicker } from '../components/ColorPicker';
import { KEYBOARD_DONE_ID } from '../components/KeyboardDoneAccessory';
import { PressableScale } from '../components/PressableScale';
import { useCreateTag, useDeleteTag, useTags, useUpdateTag } from '../hooks/useTags';
import { tagPalette, useTheme } from '../theme';

/** Manage Tags: list the user's tags with rename, recolor, delete, and create (FR-TAG-01/03). */
export function ManageTagsScreen() {
  const t = useTheme();
  const navigation = useNavigation();
  const { data: tags = [] } = useTags();
  const createTag = useCreateTag();
  const updateTag = useUpdateTag();
  const deleteTag = useDeleteTag();

  // `null` = nothing open; `'new'` = the create editor; otherwise the id being edited.
  const [editing, setEditing] = useState<string | 'new' | null>(null);

  const confirmDelete = (tag: Tag) => {
    Alert.alert(
      'Delete tag?',
      `"${tag.name}" will be removed from all entries. The entries themselves are kept.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteTag.mutate(tag.id) },
      ],
    );
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: t.colors.bg }}>
      {/* Custom header: a bare back chevron (no bg/border) + centered title. */}
      <View style={{ height: 52, justifyContent: 'center' }}>
        <PressableScale
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Back"
          hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: 64,
            paddingLeft: t.space[3],
            alignItems: 'flex-start',
            justifyContent: 'center',
          }}
        >
          <ChevronLeft size={28} color={t.colors.text} />
        </PressableScale>
        <Text
          style={{
            textAlign: 'center',
            color: t.colors.text,
            fontSize: t.fontSize.headline,
            fontWeight: t.fontWeight.bold,
          }}
        >
          Manage tags
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: t.screenGutter, gap: t.space[4] }}
        keyboardShouldPersistTaps="handled"
      >
        {editing === 'new' ? (
          <TagEditor
            busy={createTag.isPending}
            onCancel={() => setEditing(null)}
            onSave={(name, color) =>
              createTag.mutate({ name, color }, { onSuccess: () => setEditing(null) })
            }
          />
        ) : null}

        {tags.length === 0 && editing !== 'new' ? (
          <Text style={{ color: t.colors.textMuted, fontSize: t.fontSize.callout, textAlign: 'center', marginTop: t.space[8] }}>
            No tags yet. Create one to label and filter your entries.
          </Text>
        ) : null}

        {tags.length > 0 ? (
          <View
            style={{
              borderRadius: t.radius.md,
              borderWidth: 1,
              borderColor: t.colors.border,
              backgroundColor: t.colors.surface,
              overflow: 'hidden',
            }}
          >
            {tags.map((tag, i) =>
              editing === tag.id ? (
                <View key={tag.id} style={{ padding: t.space[4] }}>
                  <TagEditor
                    initialName={tag.name}
                    initialColor={tag.color}
                    busy={updateTag.isPending}
                    onCancel={() => setEditing(null)}
                    onSave={(name, color) =>
                      updateTag.mutate(
                        { id: tag.id, body: { name, color } },
                        { onSuccess: () => setEditing(null) },
                      )
                    }
                  />
                </View>
              ) : (
                <View
                  key={tag.id}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: t.space[3],
                    paddingVertical: t.space[3],
                    paddingHorizontal: t.space[4],
                    borderTopWidth: i === 0 ? 0 : 1,
                    borderTopColor: t.colors.border,
                  }}
                >
                  <View
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: t.radius.pill,
                      backgroundColor: tag.color ?? t.colors.textMuted,
                    }}
                  />
                  <Text style={{ flex: 1, color: t.colors.text, fontSize: t.fontSize.body, fontWeight: t.fontWeight.medium }}>
                    {tag.name}
                  </Text>
                  <PressableScale
                    onPress={() => setEditing(tag.id)}
                    scaleTo={0.85}
                    accessibilityRole="button"
                    accessibilityLabel={`Edit ${tag.name}`}
                    hitSlop={8}
                    style={{ padding: t.space[2] }}
                  >
                    <Pencil size={18} color={t.colors.textMuted} />
                  </PressableScale>
                  <PressableScale
                    onPress={() => confirmDelete(tag)}
                    scaleTo={0.85}
                    accessibilityRole="button"
                    accessibilityLabel={`Delete ${tag.name}`}
                    hitSlop={8}
                    style={{ padding: t.space[2] }}
                  >
                    <Trash2 size={18} color={t.colors.danger} />
                  </PressableScale>
                </View>
              ),
            )}
          </View>
        ) : null}
      </ScrollView>

      {/* New tag lives at the bottom, styled like the Empty State primary action. */}
      {editing !== 'new' ? (
        <View style={{ paddingHorizontal: t.screenGutter, paddingTop: t.space[2], paddingBottom: t.space[1] }}>
          <Button
            onPress={() => setEditing('new')}
            leadingIcon={<Plus size={20} color={t.colors.onAccent} />}
          >
            New tag
          </Button>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

interface TagEditorProps {
  initialName?: string;
  initialColor?: string | null;
  busy?: boolean;
  onSave: (name: string, color: string) => void;
  onCancel: () => void;
}

/** Inline name + color editor, reused for create and edit. */
function TagEditor({ initialName, initialColor, busy, onSave, onCancel }: TagEditorProps) {
  const t = useTheme();
  const [name, setName] = useState(initialName ?? '');
  const [color, setColor] = useState<string>(initialColor ?? tagPalette[0]);

  const save = () => {
    const trimmed = name.trim();
    if (!trimmed || busy) return;
    onSave(trimmed, color);
  };

  return (
    <View
      style={{
        gap: t.space[3],
        padding: t.space[4],
        borderRadius: t.radius.md,
        borderWidth: 1,
        borderColor: t.colors.accent,
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
        onSubmitEditing={save}
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
      <ColorPicker value={color} onChange={setColor} />
      <View style={{ flexDirection: 'row', gap: t.space[2] }}>
        <PressableScale
          onPress={save}
          accessibilityRole="button"
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: t.space[2],
            paddingVertical: t.space[3],
            borderRadius: t.radius.pill,
            backgroundColor: t.colors.accent,
            opacity: name.trim() && !busy ? 1 : 0.4,
          }}
        >
          <Check size={16} color={t.colors.onAccent} />
          <Text style={{ color: t.colors.onAccent, fontSize: t.fontSize.subhead, fontWeight: t.fontWeight.bold }}>
            Save
          </Text>
        </PressableScale>
        <PressableScale
          onPress={onCancel}
          accessibilityRole="button"
          style={{
            paddingVertical: t.space[3],
            paddingHorizontal: t.space[5],
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
  );
}
