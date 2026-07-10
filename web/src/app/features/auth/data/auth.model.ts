export interface UserDto {
  id: number;
  phone: string;
  name: string | null;
}

// Mirror of the API error contract (api: auth-errors.ts, design D6).
// The API is locale-free; Ukrainian copy lives here.
type AuthErrorCode =
  | 'PHONE_INVALID'
  | 'PROFILE_INVALID'
  | 'RATE_LIMITED_60S'
  | 'RATE_LIMITED_DAILY'
  | 'OTP_INVALID'
  | 'OTP_EXPIRED_OR_MISSING'
  | 'OTP_ATTEMPTS_EXCEEDED'
  | 'UNAUTHENTICATED';

const MESSAGES: Record<AuthErrorCode, string> = {
  PHONE_INVALID: 'Невірний формат номера. Приклад: +380 67 123 45 67',
  PROFILE_INVALID: 'Неможливо зберегти профіль — перевірте введене імʼя',
  RATE_LIMITED_60S: 'Зачекайте хвилину, перш ніж запитати новий код',
  RATE_LIMITED_DAILY:
    'Вичерпано денний ліміт SMS для цього номера. Спробуйте завтра',
  OTP_INVALID: 'Невірний код. Спробуйте ще раз',
  OTP_EXPIRED_OR_MISSING: 'Код недійсний або протермінований. Запитайте новий',
  OTP_ATTEMPTS_EXCEEDED: 'Забагато невдалих спроб. Запитайте новий код',
  UNAUTHENTICATED: 'Потрібно увійти',
};

const FALLBACK_MESSAGE = 'Щось пішло не так. Спробуйте ще раз';

export function authErrorMessage(error: unknown): string {
  const code = (error as { error?: { code?: string } })?.error?.code;
  return MESSAGES[code as AuthErrorCode] ?? FALLBACK_MESSAGE;
}
