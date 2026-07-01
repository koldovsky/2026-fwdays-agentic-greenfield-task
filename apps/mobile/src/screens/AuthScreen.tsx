import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { validatePassword } from '@honeydo/shared';
import { ApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { useGoogleAuth } from '../auth/useGoogleAuth';
import { useTheme } from '../theme';

type Mode = 'signin' | 'signup';

export function AuthScreen() {
  const t = useTheme();
  const { signIn, signUp } = useAuth();
  const google = useGoogleAuth();

  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const passwordCheck = validatePassword(password);
  const showPasswordHint = mode === 'signup' && password.length > 0 && !passwordCheck.valid;
  const canSubmit =
    email.trim().length > 0 &&
    password.length > 0 &&
    (mode === 'signin' || passwordCheck.valid) &&
    !submitting;

  const submit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      if (mode === 'signup') await signUp(email.trim(), password);
      else await signIn(email.trim(), password);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Something went wrong. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: t.colors.bg }}
    >
      <View style={{ flex: 1, justifyContent: 'center', padding: t.screenGutter, gap: t.space[4] }}>
        <View style={{ gap: t.space[2] }}>
          <Text
            style={{
              color: t.colors.text,
              fontSize: t.fontSize.largeTitle,
              fontWeight: t.fontWeight.heavy,
            }}
          >
            {mode === 'signin' ? 'Welcome back' : 'Create your hive'}
          </Text>
          <Text style={{ color: t.colors.textMuted, fontSize: t.fontSize.body }}>
            Track your day, one sweet entry at a time.
          </Text>
        </View>

        <View style={{ gap: t.space[3] }}>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="Email"
            placeholderTextColor={t.colors.textMuted}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            style={inputStyle(t)}
          />
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Password"
            placeholderTextColor={t.colors.textMuted}
            secureTextEntry
            autoCapitalize="none"
            style={inputStyle(t)}
          />
          {showPasswordHint ? (
            <Text style={{ color: t.colors.textMuted, fontSize: t.fontSize.footnote }}>
              Password needs {passwordCheck.errors.join(', ')}.
            </Text>
          ) : null}
        </View>

        {error ? (
          <Text style={{ color: t.colors.accent, fontSize: t.fontSize.subhead }}>{error}</Text>
        ) : null}

        <Pressable
          onPress={() => void submit()}
          disabled={!canSubmit}
          style={{
            backgroundColor: t.colors.accent,
            opacity: canSubmit ? 1 : 0.5,
            borderRadius: t.radius.pill,
            paddingVertical: t.space[4],
            alignItems: 'center',
          }}
        >
          {submitting ? (
            <ActivityIndicator color={t.colors.onAccent} />
          ) : (
            <Text
              style={{
                color: t.colors.onAccent,
                fontSize: t.fontSize.headline,
                fontWeight: t.fontWeight.semibold,
              }}
            >
              {mode === 'signin' ? 'Sign in' : 'Sign up'}
            </Text>
          )}
        </Pressable>

        {google.available ? (
          <Pressable
            onPress={() => void google.signIn()}
            style={{
              borderColor: t.colors.border,
              borderWidth: 1,
              borderRadius: t.radius.pill,
              paddingVertical: t.space[4],
              alignItems: 'center',
            }}
          >
            <Text style={{ color: t.colors.text, fontSize: t.fontSize.headline }}>
              Continue with Google
            </Text>
          </Pressable>
        ) : null}

        <Pressable
          onPress={() => {
            setMode(mode === 'signin' ? 'signup' : 'signin');
            setError(null);
          }}
          style={{ alignItems: 'center', paddingVertical: t.space[2] }}
        >
          <Text style={{ color: t.colors.textMuted, fontSize: t.fontSize.subhead }}>
            {mode === 'signin'
              ? "New here? Create an account"
              : 'Already have an account? Sign in'}
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

function inputStyle(t: ReturnType<typeof useTheme>) {
  return {
    backgroundColor: t.colors.surface,
    borderColor: t.colors.border,
    borderWidth: 1,
    borderRadius: t.radius.md,
    paddingHorizontal: t.space[4],
    paddingVertical: t.space[4],
    color: t.colors.text,
    fontSize: t.fontSize.body,
  } as const;
}
