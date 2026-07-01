import { View } from 'react-native';
import { EmptyState } from '../components/EmptyState';
import { useTheme } from '../theme';

/**
 * Timer tab. Shows the first-run empty state until there are entries (FR-SHELL-03). The
 * running timer + start/stop land with the `time-entries` capability.
 */
export function TimerScreen() {
  const t = useTheme();
  // Placeholder until time-entries wires the real query; flip drives the empty state.
  const hasEntries = false;

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.bg }}>
      {hasEntries ? null : (
        <EmptyState
          title="Your hive is empty"
          description="Start a timer with a quick note about what you're doing. Stop it when you switch. That's the whole thing."
          actionLabel="Start your first entry"
          onAction={() => {
            // Wired to the start-timer flow in the time-entries capability.
          }}
          tip="You can start from your Home Screen too"
        />
      )}
    </View>
  );
}
