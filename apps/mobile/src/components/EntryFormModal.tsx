import { useEffect, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import type { TimeEntry } from '@honeydo/shared';
import { useTheme } from '../theme';
import { Button } from './Button';
import { Input } from './Input';
import { KEYBOARD_DONE_ID } from './KeyboardDoneAccessory';
import { TagPicker } from './TagPicker';
import { TextLink } from './TextLink';

const entrySchema = z
  .object({
    note: z.string().trim().min(1, 'Add a short note'),
    startedAt: z.date(),
    stoppedAt: z.date(),
  })
  .refine((v) => v.stoppedAt.getTime() > v.startedAt.getTime(), {
    message: 'End must be after start',
    path: ['stoppedAt'],
  });

type RhfValues = z.infer<typeof entrySchema>;
/** What the form submits: the validated fields plus the selected tag ids. */
export type EntryFormValues = RhfValues & { tagIds: string[] };

interface EntryFormModalProps {
  visible: boolean;
  /** Entry to edit, or null/undefined to add a new manual entry. */
  entry?: TimeEntry | null;
  onClose: () => void;
  onSubmit: (values: EntryFormValues) => Promise<void> | void;
  onDelete?: (entry: TimeEntry) => void;
}

/** A sensible default window for a new manual entry: the last hour. */
function defaultValues(entry?: TimeEntry | null): RhfValues {
  if (entry) {
    return {
      note: entry.note,
      startedAt: new Date(entry.startedAt),
      stoppedAt: new Date(entry.stoppedAt ?? Date.now()),
    };
  }
  const now = new Date();
  return { note: '', startedAt: new Date(now.getTime() - 3_600_000), stoppedAt: now };
}

/**
 * Add-or-edit sheet for a time entry (FR-ENTRY-04/05). Validated with React Hook Form +
 * Zod (end-after-start); the times feed the resolver via `Controller` and native pickers.
 * The form resets to fresh defaults each time it opens.
 */
export function EntryFormModal({
  visible,
  entry,
  onClose,
  onSubmit,
  onDelete,
}: EntryFormModalProps) {
  const t = useTheme();
  const isEdit = !!entry;

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<RhfValues>({
    resolver: standardSchemaResolver(entrySchema),
    defaultValues: defaultValues(entry),
  });

  // Tags aren't RHF-controlled; keep them in local state seeded from the entry.
  const [tagIds, setTagIds] = useState<string[]>([]);

  // Clear/seed the form each time the sheet opens (fresh add, or the edited entry).
  useEffect(() => {
    if (visible) {
      reset(defaultValues(entry));
      setTagIds(entry?.tags.map((tag) => tag.id) ?? []);
    }
  }, [visible, entry, reset]);

  const submit = async (values: RhfValues) => {
    await onSubmit({ ...values, tagIds });
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: t.colors.scrim }}
      >
        <View
          style={{
            backgroundColor: t.colors.bg,
            borderTopLeftRadius: t.radius.lg,
            borderTopRightRadius: t.radius.lg,
            padding: t.screenGutter,
            paddingBottom: t.space[8],
            gap: t.space[4],
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ color: t.colors.text, fontSize: t.fontSize.title2, fontWeight: t.fontWeight.heavy }}>
              {isEdit ? 'Edit entry' : 'Add entry'}
            </Text>
            <TextLink onPress={onClose}>Cancel</TextLink>
          </View>

          <Controller
            control={control}
            name="note"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Note"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder="What did you work on?"
                autoCorrect={false}
                spellCheck={false}
                inputAccessoryViewID={KEYBOARD_DONE_ID}
                returnKeyType="done"
              />
            )}
          />
          {errors.note ? (
            <Text style={{ color: t.colors.danger, fontSize: t.fontSize.footnote }}>
              {errors.note.message}
            </Text>
          ) : null}

          {/* When — a grouped card of tappable date/time controls (not a text field). */}
          <View style={{ gap: t.space[2] }}>
            <Text
              style={{
                color: t.colors.textMuted,
                fontSize: t.fontSize.footnote,
                fontWeight: t.fontWeight.bold,
                letterSpacing: 1,
              }}
            >
              WHEN
            </Text>
            <View
              style={{
                backgroundColor: t.colors.surface,
                borderWidth: 1,
                borderColor: t.colors.border,
                borderRadius: t.radius.md,
              }}
            >
              <Controller
                control={control}
                name="startedAt"
                render={({ field: { onChange, value } }) => (
                  <DateTimeField label="Start" value={value} onChange={onChange} />
                )}
              />
              <View style={{ height: 1, backgroundColor: t.colors.border, marginLeft: t.space[4] }} />
              <Controller
                control={control}
                name="stoppedAt"
                render={({ field: { onChange, value } }) => (
                  <DateTimeField label="End" value={value} onChange={onChange} />
                )}
              />
            </View>
            <Text style={{ color: t.colors.textMuted, fontSize: t.fontSize.caption }}>
              Tap the date or time to change it.
            </Text>
          </View>
          {errors.stoppedAt ? (
            <Text style={{ color: t.colors.danger, fontSize: t.fontSize.footnote }}>
              {errors.stoppedAt.message}
            </Text>
          ) : null}

          <TagPicker value={tagIds} onChange={setTagIds} />

          <Button onPress={() => void handleSubmit(submit)()} loading={isSubmitting}>
            {isEdit ? 'Save changes' : 'Add entry'}
          </Button>

          {isEdit && onDelete ? (
            <Pressable
              onPress={() => onDelete(entry)}
              accessibilityRole="button"
              style={{ alignItems: 'center', paddingVertical: t.space[2] }}
            >
              <Text style={{ color: t.colors.danger, fontSize: t.fontSize.subhead, fontWeight: t.fontWeight.semibold }}>
                Delete entry
              </Text>
            </Pressable>
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

interface DateTimeFieldProps {
  label: string;
  value: Date;
  onChange: (date: Date) => void;
}

/**
 * A labeled date-time control. iOS uses the native `compact` picker (opens its own
 * popover — no layout shift, no keyboard clash). Android reveals a dialog on tap.
 */
function DateTimeField({ label, value, onChange }: DateTimeFieldProps) {
  const t = useTheme();
  const [open, setOpen] = useState(false);
  const formatted = value.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        minHeight: 52,
        paddingHorizontal: t.space[4],
        paddingVertical: t.space[2],
      }}
    >
      <Text style={{ color: t.colors.text, fontSize: t.fontSize.body, fontWeight: t.fontWeight.medium }}>
        {label}
      </Text>

      {Platform.OS === 'ios' ? (
        <DateTimePicker
          value={value}
          mode="datetime"
          display="compact"
          accentColor={t.colors.accent}
          themeVariant={t.scheme}
          // Opening the picker popover; drop the keyboard so nothing overlaps.
          onChange={(_e, date) => {
            Keyboard.dismiss();
            if (date) onChange(date);
          }}
        />
      ) : (
        <>
          <Pressable
            onPress={() => {
              Keyboard.dismiss();
              setOpen(true);
            }}
            accessibilityRole="button"
            style={{
              paddingHorizontal: t.space[3],
              paddingVertical: t.space[2],
              borderRadius: t.radius.xs,
              backgroundColor: t.colors.fillSoft,
            }}
          >
            <Text style={{ color: t.colors.accent, fontSize: t.fontSize.body, fontWeight: t.fontWeight.semibold }}>
              {formatted}
            </Text>
          </Pressable>
          {open ? (
            <DateTimePicker
              value={value}
              mode="datetime"
              display="default"
              onChange={(_e, date) => {
                setOpen(false);
                if (date) onChange(date);
              }}
            />
          ) : null}
        </>
      )}
    </View>
  );
}
