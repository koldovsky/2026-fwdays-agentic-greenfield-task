'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'otp' | 'success'>('email');
  const [method, setMethod] = useState<'magic' | 'otp'>('magic');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleRequestAuth = async (selectedMethod: 'magic' | 'otp') => {
    if (!email || !email.includes('@')) {
      setError('Будь ласка, введіть коректну адресу електронної пошти');
      return;
    }

    setMethod(selectedMethod);
    setLoading(true);
    setError(null);
    setMessage(null);

    const endpoint = selectedMethod === 'magic' ? '/api/auth/magic' : '/api/auth/otp';

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Не вдалося надіслати запит. Спробуйте пізніше');
      }

      setMessage(data.message);

      if (selectedMethod === 'otp') {
        setStep('otp');
      } else {
        setStep('success');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Виникла помилка під час надсилання повідомлення';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6 || isNaN(Number(code))) {
      setError('Код має складатися з 6 цифр');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Некоректний код або його термін дії закінчився');
      }

      router.push('/dashboard');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Некоректний код або його термін дії закінчився';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setStep('email');
    setCode('');
    setMessage(null);
    setError(null);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg-page px-4 font-sans text-text-primary">
      <div className="w-full max-w-md border border-border-custom bg-bg-card p-8">
        
        {/* Header */}
        <div className="mb-8 text-center sm:text-left border-b border-border-custom pb-6">
          <h1 className="font-display text-2xl font-medium tracking-tight text-text-primary">
            Вхід в aControl
          </h1>
          <p className="mt-2 text-sm text-text-secondary leading-relaxed">
            Вхід виконується безпарольно за допомогою Telegram-бота
          </p>
        </div>

        {error && (
          <div className="mb-6 border border-status-danger/20 bg-status-danger/5 p-4 text-sm text-status-danger leading-relaxed">
            {error}
          </div>
        )}

        {message && step === 'success' && (
          <div className="mb-6 border border-status-success/20 bg-status-success/5 p-4 text-sm text-status-success leading-relaxed">
            {message}
          </div>
        )}

        {/* Step 1: Input Email & Select Authentication Method */}
        {step === 'email' && (
          <div className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="email" className="font-display text-xs font-medium uppercase tracking-wider text-text-secondary">
                Електронна пошта
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@example.com"
                disabled={loading}
                className="w-full border border-border-custom bg-bg-secondary px-4 py-3 font-mono text-sm placeholder-text-muted outline-none transition-colors focus:border-border-active"
              />
            </div>

            <div className="flex flex-col gap-3 pt-2">
              <button
                type="button"
                disabled={loading}
                onClick={() => handleRequestAuth('magic')}
                className="flex w-full items-center justify-center border border-accent-blue bg-accent-blue py-3 font-sans text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
              >
                {loading && method === 'magic' ? (
                  <span className="h-4 w-4 animate-spin border-2 border-white border-t-transparent mr-2"></span>
                ) : null}
                Увійти за посиланням (Magic Link)
              </button>

              <button
                type="button"
                disabled={loading}
                onClick={() => handleRequestAuth('otp')}
                className="flex w-full items-center justify-center border border-border-custom bg-transparent py-3 font-sans text-sm font-medium text-text-primary transition-colors hover:bg-bg-secondary disabled:opacity-50"
              >
                {loading && method === 'otp' ? (
                  <span className="h-4 w-4 animate-spin border-2 border-accent-blue border-t-transparent mr-2"></span>
                ) : null}
                Увійти за одноразовим кодом (OTP)
              </button>
            </div>
          </div>
        )}

        {/* Step 2: OTP Verification input */}
        {step === 'otp' && (
          <form onSubmit={handleVerifyOtp} className="space-y-6">
            <p className="text-xs text-text-secondary leading-relaxed mb-4">
              {message || 'Ми надіслали 6-значний код у ваш Telegram-бот. Будь ласка, введіть його для входу.'}
            </p>

            <div className="space-y-2">
              <label htmlFor="code" className="font-display text-xs font-medium uppercase tracking-wider text-text-secondary">
                Одноразовий код
              </label>
              <input
                id="code"
                type="text"
                maxLength={6}
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="123456"
                disabled={loading}
                className="w-full border border-border-custom bg-bg-secondary px-4 py-3 font-mono text-center text-lg tracking-widest placeholder-text-muted outline-none transition-colors focus:border-border-active"
              />
            </div>

            <div className="flex flex-col gap-3 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center border border-accent-blue bg-accent-blue py-3 font-sans text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? (
                  <span className="h-4 w-4 animate-spin border-2 border-white border-t-transparent mr-2"></span>
                ) : null}
                Підтвердити код
              </button>

              <button
                type="button"
                onClick={handleReset}
                disabled={loading}
                className="flex w-full items-center justify-center border border-border-custom bg-transparent py-3 font-sans text-sm font-medium text-text-secondary transition-colors hover:bg-bg-secondary"
              >
                Назад
              </button>
            </div>
          </form>
        )}

        {/* Step 3: Success message with back action (for Magic Link request confirmation) */}
        {step === 'success' && (
          <div className="space-y-6">
            <button
              type="button"
              onClick={handleReset}
              className="flex w-full items-center justify-center border border-border-custom bg-transparent py-3 font-sans text-sm font-medium text-text-secondary transition-colors hover:bg-bg-secondary"
            >
              Повернутися до входу
            </button>
          </div>
        )}

        {/* Footer info links */}
        <div className="mt-8 border-t border-border-custom pt-6 text-center">
          <p className="text-xs text-text-secondary">
            Немає профілю?{' '}
            <a href="/register" className="text-accent-blue hover:underline">
              Зареєструватися через Telegram
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
