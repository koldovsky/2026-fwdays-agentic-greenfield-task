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
import { Controller, useForm } from 'react-hook-form';
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { ApiError } from '../api/client';
import { type AuthFormValues, signInSchema, signUpSchema } from '../auth/authSchemas';
import { useGoogleAuth } from '../auth/useGoogleAuth';
import { useAuthStore } from '../store/authStore';
import { useTheme } from '../theme';

type Mode = 'signin' | 'signup';

export function AuthScreen() {
  const t = useTheme();
  const signIn = useAuthStore((s) => s.signIn);
  const signUp = useAuthStore((s) => s.signUp);
  const google = useGoogleAuth();

  const [mode, setMode] = useState<Mode>('signin');
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AuthFormValues>({
    resolver: standardSchemaResolver(mode === 'signup' ? signUpSchema : signInSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (values: AuthFormValues) => {
    setServerError(null);
    try {
      if (mode === 'signup') await signUp(values.email.trim(), values.password);
      else await signIn(values.email.trim(), values.password);
    } catch (e) {
      setServerError(
        e instanceof ApiError ? e.message : 'Something went wrong. Try again.',
      );
    }
  };

  const toggleMode = () => {
    setMode(mode === 'signin' ? 'signup' : 'signin');
    setServerError(null);
    reset({ email: '', password: '' });
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
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder="Email"
                placeholderTextColor={t.colors.textMuted}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                style={inputStyle(t)}
              />
            )}
          />
          {errors.email ? <FieldError t={t} message={errors.email.message} /> : null}

          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder="Password"
                placeholderTextColor={t.colors.textMuted}
                secureTextEntry
                autoCapitalize="none"
                style={inputStyle(t)}
              />
            )}
          />
          {errors.password ? <FieldError t={t} message={errors.password.message} /> : null}
        </View>

        {serverError ? (
          <Text style={{ color: t.colors.accent, fontSize: t.fontSize.subhead }}>
            {serverError}
          </Text>
        ) : null}

        <Pressable
          onPress={() => void handleSubmit(onSubmit)()}
          disabled={isSubmitting}
          style={{
            backgroundColor: t.colors.accent,
            opacity: isSubmitting ? 0.5 : 1,
            borderRadius: t.radius.pill,
            paddingVertical: t.space[4],
            alignItems: 'center',
          }}
        >
          {isSubmitting ? (
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

        <Pressable onPress={toggleMode} style={{ alignItems: 'center', paddingVertical: t.space[2] }}>
          <Text style={{ color: t.colors.textMuted, fontSize: t.fontSize.subhead }}>
            {mode === 'signin'
              ? 'New here? Create an account'
              : 'Already have an account? Sign in'}
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

function FieldError({ t, message }: { t: ReturnType<typeof useTheme>; message?: string }) {
  if (!message) return null;
  return (
    <Text style={{ color: t.colors.accent, fontSize: t.fontSize.footnote }}>{message}</Text>
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
