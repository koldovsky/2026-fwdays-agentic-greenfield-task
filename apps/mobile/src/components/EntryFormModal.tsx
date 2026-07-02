import { useState } from 'react';
import {
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

export type EntryFormValues = z.infer<typeof entrySchema>;

interface EntryFormModalProps {
  visible: boolean;
  /** Entry to edit, or null/undefined to add a new manual entry. */
  entry?: TimeEntry | null;
  onClose: () => void;
  onSubmit: (values: EntryFormValues) => Promise<void> | void;
  onDelete?: (entry: TimeEntry) => void;
}

/** A sensible default window for a new manual entry: the last hour. */
function defaultValues(entry?: TimeEntry | null): EntryFormValues {
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
    formState: { errors, isSubmitting },
  } = useForm<EntryFormValues>({
    resolver: standardSchemaResolver(entrySchema),
    defaultValues: defaultValues(entry),
  });

  const submit = async (values: EntryFormValues) => {
    await onSubmit(values);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: t.colors.fillSoft }}
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
                autoFocus={!isEdit}
              />
            )}
          />
          {errors.note ? (
            <Text style={{ color: t.colors.accent, fontSize: t.fontSize.footnote }}>
              {errors.note.message}
            </Text>
          ) : null}

          <Controller
            control={control}
            name="startedAt"
            render={({ field: { onChange, value } }) => (
              <DateTimeField label="Start" value={value} onChange={onChange} />
            )}
          />
          <Controller
            control={control}
            name="stoppedAt"
            render={({ field: { onChange, value } }) => (
              <DateTimeField label="End" value={value} onChange={onChange} />
            )}
          />
          {errors.stoppedAt ? (
            <Text style={{ color: t.colors.accent, fontSize: t.fontSize.footnote }}>
              {errors.stoppedAt.message}
            </Text>
          ) : null}

          <Button onPress={() => void handleSubmit(submit)()} loading={isSubmitting}>
            {isEdit ? 'Save changes' : 'Add entry'}
          </Button>

          {isEdit && onDelete ? (
            <Pressable
              onPress={() => onDelete(entry)}
              accessibilityRole="button"
              style={{ alignItems: 'center', paddingVertical: t.space[2] }}
            >
              <Text style={{ color: t.colors.textMuted, fontSize: t.fontSize.subhead, fontWeight: t.fontWeight.semibold }}>
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

/** A labeled row that reveals a native date-time picker (FR-ENTRY-04/05). */
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
    <View style={{ gap: t.space[2] }}>
      <Pressable
        onPress={() => setOpen((v) => !v)}
        accessibilityRole="button"
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: 52,
          paddingHorizontal: t.space[4],
          backgroundColor: t.colors.surfaceAlt,
          borderWidth: 1,
          borderColor: open ? t.colors.accent : t.colors.border,
          borderRadius: t.radius.md,
        }}
      >
        <Text style={{ color: t.colors.textMuted, fontSize: t.fontSize.subhead, fontWeight: t.fontWeight.semibold }}>
          {label}
        </Text>
        <Text style={{ color: t.colors.text, fontSize: t.fontSize.body }}>{formatted}</Text>
      </Pressable>
      {open ? (
        <DateTimePicker
          value={value}
          mode="datetime"
          display="spinner"
          themeVariant={t.scheme}
          onChange={(_e, date) => {
            if (date) onChange(date);
          }}
        />
      ) : null}
    </View>
  );
}
