'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export interface WalletCard {
  cardToken: string;
  maskedPan: string;
  country?: string;
}

export interface SubscriptionData {
  id: string;
  tariffPlan: 'monthly' | 'yearly';
  status: 'created' | 'active' | 'paused' | 'suspended' | 'cancelled';
  autoRenew: boolean;
  currentPeriodEnd: string; // ISO date string
  cardToken?: string | null;
  walletId?: string | null;
}

interface BillingManagerProps {
  subscription: SubscriptionData | null;
  cards: WalletCard[];
}

export default function BillingManager({ subscription, cards }: BillingManagerProps) {
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('monthly');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [isPauseOpen, setIsPauseOpen] = useState(false);
  const [isCancelOpen, setIsCancelOpen] = useState(false);

  const card = cards[0] || null;

  const handleCheckout = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/billing/invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tariffPlan: selectedPlan }),
      });
      const data = await res.json();
      if (res.ok && data.pageUrl) {
        window.location.href = data.pageUrl;
      } else {
        setError(data.error || 'Помилка під час створення рахунку');
      }
    } catch {
      setError('Не вдалося звʼязатися з сервером');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePause = async () => {
    setIsLoading(true);
    setError(null);
    setIsPauseOpen(false);
    try {
      const res = await fetch('/api/billing/pause', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        router.refresh();
      } else {
        setError(data.error || 'Помилка при тимчасовому призупиненні підписки');
      }
    } catch {
      setError('Не вдалося звʼязатися з сервером');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = async () => {
    setIsLoading(true);
    setError(null);
    setIsCancelOpen(false);
    try {
      const res = await fetch('/api/billing/cancel', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        router.refresh();
      } else {
        setError(data.error || 'Помилка при скасуванні підписки');
      }
    } catch {
      setError('Не вдалося звʼязатися з сервером');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResume = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/billing/resume', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        if (data.redirectUrl) {
          window.location.href = data.redirectUrl;
        } else {
          router.refresh();
        }
      } else {
        setError(data.error || 'Помилка при відновленні підписки');
      }
    } catch {
      setError('Не вдалося звʼязатися з сервером');
    } finally {
      setIsLoading(false);
    }
  };

  // Format date helper
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('uk-UA', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  // Check if we have an active billing relationship
  const hasBilling = subscription && subscription.cardToken;

  return (
    <div className="mt-8 border border-border-custom bg-bg-card p-8">
      <h2 className="font-display text-xl font-medium text-text-primary mb-6 border-b border-border-custom pb-4">
        Керування підпискою та оплатою
      </h2>

      {error && (
        <div className="mb-6 border border-status-danger bg-status-danger/5 p-4 text-sm text-status-danger">
          {error}
        </div>
      )}

      {/* CASE 1: Pricing table / checkout (no active subscription or cardToken is missing) */}
      {!hasBilling ? (
        <div>
          <p className="text-sm text-text-secondary leading-relaxed mb-8 max-w-2xl">
            Для активації автоматичної передачі конверсій з Google Таблиць оберіть один із тарифних планів. 
            Оплата здійснюється в гривневому еквіваленті за допомогою платіжного шлюзу Monobank. 
            Картка буде збережена для автоматичного подовження.
          </p>

          <div className="grid gap-6 md:grid-cols-2 max-w-3xl mx-auto mb-8">
            {/* Monthly Plan */}
            <div 
              onClick={() => setSelectedPlan('monthly')}
              className={`cursor-pointer border p-6 relative transition-all duration-300 ${
                selectedPlan === 'monthly' 
                  ? 'border-accent-blue bg-bg-secondary shadow-sm ring-1 ring-accent-blue' 
                  : 'border-border-custom bg-bg-card hover:border-border-active'
              }`}
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-display text-lg font-medium text-text-primary">Місячний</h3>
                  <p className="text-xs text-text-muted mt-1">Оплата кожного місяця</p>
                </div>
                {selectedPlan === 'monthly' && (
                  <span className="h-4 w-4 rounded-full border border-accent-blue bg-accent-blue flex items-center justify-center">
                    <span className="h-1.5 w-1.5 rounded-full bg-white"></span>
                  </span>
                )}
              </div>
              <div className="mt-6 flex items-baseline">
                <span className="font-display text-3xl font-semibold text-text-primary">$10.99</span>
                <span className="text-sm text-text-secondary ml-2">/ місяць</span>
              </div>
              <p className="text-xs text-text-muted mt-4">
                UAH еквівалент за комерційним курсом Monobank
              </p>
            </div>

            {/* Yearly Plan */}
            <div 
              onClick={() => setSelectedPlan('yearly')}
              className={`cursor-pointer border p-6 relative transition-all duration-300 ${
                selectedPlan === 'yearly' 
                  ? 'border-accent-blue bg-bg-secondary shadow-sm ring-1 ring-accent-blue' 
                  : 'border-border-custom bg-bg-card hover:border-border-active'
              }`}
            >
              <span className="absolute -top-3 right-4 bg-accent-amber text-white text-[10px] font-medium tracking-wide uppercase px-2 py-0.5 rounded-sm">
                Економія ~10%
              </span>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-display text-lg font-medium text-text-primary">Річний</h3>
                  <p className="text-xs text-text-muted mt-1">Оплата раз на рік</p>
                </div>
                {selectedPlan === 'yearly' && (
                  <span className="h-4 w-4 rounded-full border border-accent-blue bg-accent-blue flex items-center justify-center">
                    <span className="h-1.5 w-1.5 rounded-full bg-white"></span>
                  </span>
                )}
              </div>
              <div className="mt-6 flex items-baseline">
                <span className="font-display text-3xl font-semibold text-text-primary">$120.00</span>
                <span className="text-sm text-text-secondary ml-2">/ рік</span>
              </div>
              <p className="text-xs text-text-muted mt-4">
                UAH еквівалент за комерційним курсом Monobank
              </p>
            </div>
          </div>

          <div className="flex justify-center">
            <button
              onClick={handleCheckout}
              disabled={isLoading}
              className="bg-accent-blue hover:bg-accent-blue/90 text-white font-medium px-8 py-3 transition-all duration-200 cursor-pointer disabled:opacity-50 min-w-[200px]"
            >
              {isLoading ? 'Завантаження...' : 'Оформити підписку'}
            </button>
          </div>
        </div>
      ) : (
        /* CASE 2: Active / paused / cancelled subscription management */
        <div className="space-y-6">
          <div className="grid gap-6 md:grid-cols-3">
            {/* Status Card */}
            <div className="border border-border-custom bg-bg-secondary p-5 flex flex-col justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary mb-2 block">
                Статус підписки
              </span>
              <div className="my-2">
                {subscription!.status === 'active' && (
                  <span className="inline-flex border border-status-success bg-status-success/5 text-status-success text-xs font-medium px-2.5 py-1">
                    Активна
                  </span>
                )}
                {subscription!.status === 'paused' && (
                  <span className="inline-flex border border-status-warning bg-status-warning/5 text-status-warning text-xs font-medium px-2.5 py-1">
                    На паузі
                  </span>
                )}
                {subscription!.status === 'suspended' && (
                  <span className="inline-flex border border-status-danger bg-status-danger/5 text-status-danger text-xs font-medium px-2.5 py-1">
                    Призупинена
                  </span>
                )}
                {subscription!.status === 'cancelled' && (
                  <span className="inline-flex border border-border-active bg-bg-card text-text-secondary text-xs font-medium px-2.5 py-1">
                    Скасована
                  </span>
                )}
              </div>
              <span className="text-xs text-text-muted mt-2 block">
                {subscription!.autoRenew ? 'Автоподовження увімкнено' : 'Автоподовження вимкнено'}
              </span>
            </div>

            {/* Plan Info Card */}
            <div className="border border-border-custom bg-bg-secondary p-5 flex flex-col justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary mb-2 block">
                Тарифний план
              </span>
              <div>
                <span className="font-display text-lg font-medium text-text-primary">
                  {subscription!.tariffPlan === 'monthly' ? 'Місячний ($10.99/міс)' : 'Річний ($120/рік)'}
                </span>
              </div>
              <span className="text-xs text-text-muted mt-2 block">
                Діє до: {formatDate(subscription!.currentPeriodEnd)}
              </span>
            </div>

            {/* Masked Card Info */}
            <div className="border border-border-custom bg-bg-secondary p-5 flex flex-col justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary mb-2 block">
                Платіжна картка
              </span>
              {card ? (
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm tracking-widest text-text-primary bg-bg-card border border-border-custom px-2.5 py-1">
                    {card.maskedPan.replace(/(.{4})/g, '$1 ')}
                  </span>
                </div>
              ) : (
                <span className="text-xs text-text-muted">Картку збережено в Monobank</span>
              )}
              <span className="text-[10px] text-text-muted mt-2 block">
                Токен безпечно збережено у гаманці Monobank
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-4 pt-4 border-t border-border-custom justify-end">
            {/* Cancel Button */}
            {subscription!.status !== 'cancelled' && (
              <button
                onClick={() => setIsCancelOpen(true)}
                disabled={isLoading}
                className="border border-status-danger bg-transparent text-status-danger hover:bg-status-danger/5 px-5 py-2 text-sm font-medium transition-all duration-200 cursor-pointer disabled:opacity-50"
              >
                Скасувати підписку
              </button>
            )}

            {/* Pause Button */}
            {subscription!.status === 'active' && subscription!.autoRenew && (
              <button
                onClick={() => setIsPauseOpen(true)}
                disabled={isLoading}
                className="border border-status-warning bg-transparent text-status-warning hover:bg-status-warning/5 px-5 py-2 text-sm font-medium transition-all duration-200 cursor-pointer disabled:opacity-50"
              >
                Призупинити (Пауза)
              </button>
            )}

            {/* Resume Button */}
            {(subscription!.status === 'paused' || subscription!.status === 'suspended' || subscription!.status === 'cancelled' || !subscription!.autoRenew) && (
              <button
                onClick={handleResume}
                disabled={isLoading}
                className="bg-accent-blue hover:bg-accent-blue/90 text-white px-6 py-2 text-sm font-medium transition-all duration-200 cursor-pointer disabled:opacity-50"
              >
                {isLoading ? 'Завантаження...' : 'Відновити підписку'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* PAUSE MODAL */}
      {isPauseOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md border border-border-custom bg-bg-card p-6 shadow-lg">
            <h3 className="font-display text-lg font-medium text-text-primary mb-4">
              Призупинити підписку?
            </h3>
            <p className="text-sm text-text-secondary leading-relaxed mb-6">
              Майбутні автоматичні платежі буде вимкнено. Сервіс синхронізації конверсій продовжить працювати 
              до завершення поточного сплаченого періоду ({formatDate(subscription!.currentPeriodEnd)}), 
              після чого підписку буде переведено у статус призупиненої.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setIsPauseOpen(false)}
                className="border border-border-custom hover:bg-bg-secondary text-text-secondary px-4 py-2 text-sm font-medium transition-colors cursor-pointer"
              >
                Скасувати
              </button>
              <button
                onClick={handlePause}
                className="bg-accent-amber hover:bg-accent-amber/90 text-white px-4 py-2 text-sm font-medium transition-colors cursor-pointer"
              >
                Підтвердити паузу
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CANCEL MODAL */}
      {isCancelOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md border border-border-custom bg-bg-card p-6 shadow-lg">
            <h3 className="font-display text-lg font-medium text-text-primary mb-4">
              Скасувати підписку?
            </h3>
            <p className="text-sm text-text-secondary leading-relaxed mb-6">
              Увага. У разі скасування підписки автоматична передача конверсій повністю зупиниться, 
              що призведе до втрати ефективності рекламних кампаній Google Ads. 
              Ви зможете користуватися сервісом до кінця сплаченого періоду ({formatDate(subscription!.currentPeriodEnd)}), 
              після чого платіжні дані буде повністю видалено з гаманця.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setIsCancelOpen(false)}
                className="border border-border-custom hover:bg-bg-secondary text-text-secondary px-4 py-2 text-sm font-medium transition-colors cursor-pointer"
              >
                Повернутися
              </button>
              <button
                onClick={handleCancel}
                className="bg-status-danger hover:bg-status-danger/95 text-white px-4 py-2 text-sm font-medium transition-colors cursor-pointer"
              >
                Скасувати підписку
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
