import { Image, Text, View } from 'react-native';
import { useTheme } from '../theme';

/** Up-to-two-letter initials from a display name, else the email's local part. */
function initials(name: string | null | undefined, email: string): string {
  const source = name?.trim() || email.split('@')[0] || '?';
  const parts = source.split(/[\s._-]+/).filter(Boolean);
  const letters =
    parts.length >= 2 ? parts[0][0] + parts[1][0] : source.slice(0, 2);
  return letters.toUpperCase();
}

interface AvatarProps {
  name: string | null | undefined;
  email: string;
  size?: number;
  /** Optional photo URL; falls back to the initials monogram (not yet wired to auth). */
  uri?: string | null;
}

/** Circular user avatar: a photo when available, otherwise an initials monogram (FR-STATS-01). */
export function Avatar({ name, email, size = 64, uri }: AvatarProps) {
  const t = useTheme();
  const dimension = { width: size, height: size, borderRadius: size / 2 };

  if (uri) {
    return (
      <Image
        source={{ uri }}
        accessibilityLabel={name || email}
        style={dimension}
      />
    );
  }

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={name || email}
      style={{
        ...dimension,
        backgroundColor: t.colors.accent,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text
        style={{
          color: t.colors.onAccent,
          fontWeight: t.fontWeight.heavy,
          fontSize: size * 0.4,
        }}
      >
        {initials(name, email)}
      </Text>
    </View>
  );
}
