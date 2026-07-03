import { InputAccessoryView, Keyboard, Platform, Text, View } from 'react-native';
import { PressableScale } from './PressableScale';
import { useTheme } from '../theme';

/** Shared nativeID linking text inputs to the Done bar below. */
export const KEYBOARD_DONE_ID = 'honeydo-keyboard-done';

/**
 * A small "Done" bar shown above the iOS keyboard (via `InputAccessoryView`) so text
 * fields have an explicit dismiss affordance. Attach to a `TextInput` by setting
 * `inputAccessoryViewID={KEYBOARD_DONE_ID}`. iOS only — renders nothing on Android.
 */
export function KeyboardDoneAccessory() {
  const t = useTheme();
  if (Platform.OS !== 'ios') return null;
  return (
    <InputAccessoryView nativeID={KEYBOARD_DONE_ID}>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'flex-end',
          paddingHorizontal: t.space[4],
          paddingVertical: t.space[2],
          backgroundColor: t.colors.surfaceAlt,
          borderTopWidth: 1,
          borderTopColor: t.colors.border,
        }}
      >
        <PressableScale
          onPress={() => Keyboard.dismiss()}
          accessibilityRole="button"
          accessibilityLabel="Hide keyboard"
          hitSlop={8}
          style={{ paddingHorizontal: t.space[3], paddingVertical: t.space[1] }}
        >
          <Text
            style={{
              color: t.colors.accent,
              fontSize: t.fontSize.callout,
              fontWeight: t.fontWeight.bold,
            }}
          >
            Done
          </Text>
        </PressableScale>
      </View>
    </InputAccessoryView>
  );
}
