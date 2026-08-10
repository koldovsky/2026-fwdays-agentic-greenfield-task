'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import QRCode from 'qrcode';

export default function RegisterPage() {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || 'acontrol_bot';

  // Step 1: Fetch the registration token
  useEffect(() => {
    const controller = new AbortController();
    async function fetchToken() {
      try {
        const response = await fetch('/api/auth/register-token', {
          method: 'POST',
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error('Не вдалося отримати токен реєстрації');
        }
        const data = await response.json();
        setToken(data.token);
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }
        const message = err instanceof Error ? err.message : 'Виникла помилка під час ініціалізації реєстрації';
        setError(message);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }
    fetchToken();
    return () => {
      controller.abort();
    };
  }, []);

  // Step 2: Poll registration status
  useEffect(() => {
    if (!token) return;

    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/auth/poll-registration?token=${token}`);
        if (response.ok) {
          const data = await response.json();
          if (data.completed) {
            clearInterval(interval);
            router.push('/dashboard');
          } else if (data.error) {
            clearInterval(interval);
            setError('Термін дії сесії реєстрації/QR-коду закінчився. Будь ласка, оновіть сторінку, щоб почати знову.');
          }
        }
      } catch (err) {
        console.error('Помилка під час опитування статусу реєстрації:', err);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [token, router]);

  const botUrl = token ? `https://t.me/${botUsername}?start=reg_${token}` : '';

  // Step 3: Draw QR Code locally using qrcode library
  useEffect(() => {
    if (canvasRef.current && botUrl) {
      QRCode.toCanvas(canvasRef.current, botUrl, { width: 176, margin: 1 }, (error) => {
        if (error) console.error('Помилка при створенні QR-коду:', error);
      });
    }
  }, [botUrl]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg-page px-4 font-sans text-text-primary">
      <div className="w-full max-w-md border border-border-custom bg-bg-card p-8">
        {/* Header */}
        <div className="mb-8 text-center sm:text-left border-b border-border-custom pb-6">
          <h1 className="font-display text-2xl font-medium tracking-tight text-text-primary">
            Реєстрація в aControl
          </h1>
          <p className="mt-2 text-sm text-text-secondary leading-relaxed">
            Для створення акаунту необхідно звʼязати ваш Telegram-профіль із ботом платформи
          </p>
        </div>

        {loading && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="h-6 w-6 animate-spin border-2 border-accent-blue border-t-transparent"></div>
            <p className="mt-4 text-sm text-text-secondary">Ініціалізація реєстрації...</p>
          </div>
        )}

        {error && (
          <div className="border border-status-danger/20 bg-status-danger/5 p-4 text-center text-sm text-status-danger">
            {error}
          </div>
        )}

        {!loading && !error && token && (
          <div className="space-y-8">
            {/* Step 1 */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="flex h-6 w-6 items-center justify-center border border-border-custom font-mono text-xs text-text-secondary">
                  1
                </span>
                <h2 className="font-display font-medium text-text-primary text-sm uppercase tracking-wider">
                  Запустіть Telegram-бот
                </h2>
              </div>
              
              {/* QR Code Container */}
              <div className="flex flex-col items-center justify-center border border-border-custom bg-bg-secondary p-6">
                <canvas
                  ref={canvasRef}
                  className="h-44 w-44 border border-border-custom bg-white"
                />
                <span className="mt-3 font-mono text-[10px] text-text-muted">
                  Скан для переходу до бота
                </span>
              </div>

              <a
                href={botUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center justify-center border border-accent-blue bg-accent-blue py-3 font-sans text-sm font-medium text-white transition-colors hover:bg-blue-700"
              >
                Відкрити в Telegram
              </a>
            </div>

            {/* Step 2 */}
            <div className="border-t border-border-custom pt-6 space-y-4">
              <div className="flex items-center gap-3">
                <span className="flex h-6 w-6 items-center justify-center border border-border-custom font-mono text-xs text-text-secondary">
                  2
                </span>
                <h2 className="font-display font-medium text-text-primary text-sm uppercase tracking-wider">
                  Введіть дані в боті
                </h2>
              </div>
              <p className="text-xs text-text-secondary leading-relaxed pl-9">
                Бот попросить вказати ваш email та адресу сайту. Після завершення введення ця сторінка автоматично оновить статус і перенаправить вас до кабінету.
              </p>
              
              {/* Short Polling Status Indicator */}
              <div className="flex items-center gap-2 pl-9">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-blue opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-blue"></span>
                </span>
                <span className="font-mono text-[10px] text-text-muted">
                  Очікування підтвердження від бота...
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Footer info links */}
        <div className="mt-8 border-t border-border-custom pt-6 text-center">
          <p className="text-xs text-text-secondary">
            Вже маєте акаунт?{' '}
            <a href="/login" className="text-accent-blue hover:underline">
              Увійти в кабінет
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
