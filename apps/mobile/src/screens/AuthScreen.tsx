import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Hexagon, Lock, Mail } from 'lucide-react-native';
import { Controller, useForm } from 'react-hook-form';
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { ApiError } from '../api/client';
import { type AuthFormValues, signInSchema, signUpSchema } from '../auth/authSchemas';
import { useGoogleAuth } from '../auth/useGoogleAuth';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { GoogleIcon } from '../icons/GoogleIcon';
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
    <View style={{ flex: 1, backgroundColor: t.colors.bg }}>
      {/* Soft amber glow from the top — the honey hero backdrop. */}
      <LinearGradient
        colors={[t.colors.accentSoft, 'transparent']}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 360 }}
        pointerEvents="none"
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: t.screenGutter, paddingTop: t.space[10] }}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        showsVerticalScrollIndicator={false}
      >
        {/* Logo mark + welcome */}
        <View style={{ alignItems: 'center', marginBottom: t.space[7] }}>
          <LinearGradient
            colors={[t.colors.highlightGold, t.colors.accentPressed]}
            start={{ x: 0.15, y: 0 }}
            end={{ x: 0.85, y: 1 }}
            style={[
              {
                width: 78,
                height: 78,
                borderRadius: 18,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: t.space[4],
              },
              t.shadow[3],
            ]}
          >
            <Hexagon size={40} color={t.colors.onAccent} fill={t.colors.onAccent} />
          </LinearGradient>
          <Text
            style={{
              color: t.colors.text,
              fontSize: t.fontSize.title,
              fontWeight: t.fontWeight.heavy,
            }}
          >
            {mode === 'signin' ? 'Welcome to Honeydo' : 'Create your hive'}
          </Text>
          <Text
            style={{
              color: t.colors.textMuted,
              fontSize: t.fontSize.callout,
              marginTop: t.space[2],
              textAlign: 'center',
            }}
          >
            Track your day, one sweet entry at a time.
          </Text>
        </View>

        {/* Fields */}
        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Email"
              leadingIcon={<Mail size={18} color={t.colors.textMuted} />}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              placeholder="you@honey.do"
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              textContentType="emailAddress"
            />
          )}
        />
        <ErrorSlot t={t} message={errors.email?.message} />

        <Controller
          control={control}
          name="password"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Password"
              leadingIcon={<Lock size={18} color={t.colors.textMuted} />}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              placeholder="••••••••"
              secureTextEntry
              autoCapitalize="none"
              textContentType="password"
            />
          )}
        />
        <ErrorSlot t={t} message={errors.password?.message} />

        <View style={{ minHeight: t.space[5], justifyContent: 'center', marginBottom: t.space[2] }}>
          {serverError ? (
            <Text style={{ color: t.colors.accent, fontSize: t.fontSize.subhead }}>
              {serverError}
            </Text>
          ) : null}
        </View>

        <Button onPress={() => void handleSubmit(onSubmit)()} loading={isSubmitting}>
          {mode === 'signin' ? 'Sign in' : 'Sign up'}
        </Button>

        {google.available ? (
          <>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: t.space[3],
                marginVertical: t.space[4],
              }}
            >
              <View style={{ flex: 1, height: 1, backgroundColor: t.colors.border }} />
              <Text style={{ color: t.colors.textMuted, fontSize: t.fontSize.footnote }}>
                or
              </Text>
              <View style={{ flex: 1, height: 1, backgroundColor: t.colors.border }} />
            </View>

            <Button
              variant="secondary"
              onPress={() => void google.signIn()}
              leadingIcon={<GoogleIcon size={20} />}
            >
              Continue with Google
            </Button>
          </>
        ) : null}

        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            marginTop: t.space[7],
          }}
        >
          <Text style={{ color: t.colors.textMuted, fontSize: t.fontSize.subhead }}>
            {mode === 'signin' ? 'New here? ' : 'Already have an account? '}
          </Text>
          <TextLink onPress={toggleMode}>
            {mode === 'signin' ? 'Create an account' : 'Sign in'}
          </TextLink>
        </View>
      </ScrollView>
    </View>
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
