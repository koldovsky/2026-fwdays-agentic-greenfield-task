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
import { TextLink } from '../components/TextLink';
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
      <View style={{ flex: 1, justifyContent: 'center', padding: t.screenGutter }}>
        <View style={{ gap: t.space[2], marginBottom: t.space[6] }}>
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
              textContentType="emailAddress"
              style={inputStyle(t)}
            />
          )}
        />
        <ErrorSlot t={t} message={errors.email?.message} />

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
              textContentType="password"
              style={inputStyle(t)}
            />
          )}
        />
        <ErrorSlot t={t} message={errors.password?.message} />

        {/* Fixed-height slot so a server error doesn't shift the layout. */}
        <View style={{ minHeight: t.space[6], justifyContent: 'center' }}>
          {serverError ? (
            <Text style={{ color: t.colors.accent, fontSize: t.fontSize.subhead }}>
              {serverError}
            </Text>
          ) : null}
        </View>

        <Pressable
          onPress={() => void handleSubmit(onSubmit)()}
          disabled={isSubmitting}
          style={{
            backgroundColor: t.colors.accent,
            opacity: isSubmitting ? 0.5 : 1,
            borderRadius: t.radius.pill,
            height: 52,
            alignItems: 'center',
            justifyContent: 'center',
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
              marginTop: t.space[3],
              borderColor: t.colors.border,
              borderWidth: 1,
              borderRadius: t.radius.pill,
              height: 52,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: t.colors.text, fontSize: t.fontSize.headline }}>
              Continue with Google
            </Text>
          </Pressable>
        ) : null}

        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            marginTop: t.space[5],
          }}
        >
          <Text style={{ color: t.colors.textMuted, fontSize: t.fontSize.subhead }}>
            {mode === 'signin' ? 'New here? ' : 'Already have an account? '}
          </Text>
          <TextLink onPress={toggleMode}>
            {mode === 'signin' ? 'Create an account' : 'Sign in'}
          </TextLink>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

/** Always-present, fixed-height row so showing/hiding a field error can't reflow the form. */
function ErrorSlot({ t, message }: { t: ReturnType<typeof useTheme>; message?: string }) {
  return (
    <View style={{ minHeight: t.space[5], paddingTop: t.space[1], paddingBottom: t.space[2] }}>
      {message ? (
        <Text style={{ color: t.colors.accent, fontSize: t.fontSize.footnote }}>
          {message}
        </Text>
      ) : null}
    </View>
  );
}

function inputStyle(t: ReturnType<typeof useTheme>) {
  return {
    backgroundColor: t.colors.surface,
    borderColor: t.colors.border,
    borderWidth: 1,
    borderRadius: t.radius.md,
    height: 52,
    paddingHorizontal: t.space[4],
    color: t.colors.text,
    fontSize: t.fontSize.body,
  } as const;
}
