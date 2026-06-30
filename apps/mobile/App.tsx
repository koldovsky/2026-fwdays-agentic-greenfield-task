import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import { ThemeProvider, useTheme } from './src/theme';

function Home() {
  const t = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: t.colors.bg, padding: t.screenGutter }]}>
      <Text style={[styles.eyebrow, { color: t.colors.textMuted }]}>TODAY</Text>
      <Text
        style={{
          color: t.colors.text,
          fontSize: t.fontSize.largeTitle,
          fontWeight: t.fontWeight.heavy,
          marginTop: t.space[2],
        }}
      >
        Your hive is empty
      </Text>
      <Text
        style={{
          color: t.colors.textMuted,
          fontSize: t.fontSize.body,
          lineHeight: t.fontSize.body * t.lineHeight.normal,
          marginTop: t.space[3],
        }}
      >
        Start a timer with a quick note about what you're doing. Stop it when you switch.
        That's the whole thing.
      </Text>

      <View
        style={[
          styles.card,
          {
            backgroundColor: t.colors.surface,
            borderColor: t.colors.border,
            borderRadius: t.radius.md,
            padding: t.space[5],
            marginTop: t.space[6],
          },
          t.shadow[2],
        ]}
      >
        <Text
          style={{
            color: t.colors.onAccent,
            backgroundColor: t.colors.accent,
            alignSelf: 'flex-start',
            paddingHorizontal: t.space[4],
            paddingVertical: t.space[2],
            borderRadius: t.radius.pill,
            fontWeight: t.fontWeight.semibold,
          }}
        >
          Start a timer
        </Text>
      </View>

      <StatusBar style={t.scheme === 'dark' ? 'light' : 'dark'} />
    </View>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <Home />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1.2,
  },
  card: {
    borderWidth: 1,
  },
});
