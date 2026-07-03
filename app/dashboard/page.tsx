import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { sessions, users, subscriptions } from '@/db/schema';
import { eq } from 'drizzle-orm';
import BillingManager, { SubscriptionData, WalletCard } from './BillingManager';
import { getWalletCards } from '@/lib/monobank';

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('session_token')?.value;

  if (!token) {
    redirect('/login');
  }

  const sessionList = await db
    .select()
    .from(sessions)
    .where(eq(sessions.token, token))
    .limit(1);

  if (sessionList.length === 0 || sessionList[0].expiresAt < new Date()) {
    // Session token expired or invalid, redirect to login
    redirect('/login');
  }

  const userList = await db
    .select()
    .from(users)
    .where(eq(users.id, sessionList[0].userId))
    .limit(1);

  if (userList.length === 0) {
    redirect('/login');
  }

  const user = userList[0];

  // Lookup user subscription
  const subList = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, user.id))
    .limit(1);

  const sub = subList[0] || null;

  let cards: WalletCard[] = [];
  if (sub && sub.walletId) {
    try {
      cards = await getWalletCards(sub.walletId);
    } catch (err) {
      console.error('Failed to fetch wallet cards:', err);
    }
  }

  const subscriptionData: SubscriptionData | null = sub ? {
    id: sub.id,
    tariffPlan: sub.tariffPlan,
    status: sub.status,
    autoRenew: sub.autoRenew,
    currentPeriodEnd: sub.currentPeriodEnd.toISOString(),
    cardToken: sub.cardToken,
    walletId: sub.walletId,
  } : null;

  return (
    <div className="flex min-h-screen flex-col bg-bg-page font-sans text-text-primary">
      {/* Top Navbar */}
      <header className="border-b border-border-custom bg-bg-card px-8 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="font-display text-xl font-medium tracking-tight text-text-primary">
            aControl
          </div>
          <div className="flex items-center gap-4">
            <span className="font-mono text-xs text-text-secondary">
              {user.email}
            </span>
            <form action="/api/auth/logout" method="POST">
              <button
                type="submit"
                className="border border-border-custom bg-transparent px-3 py-1.5 font-sans text-xs font-medium text-text-secondary transition-colors hover:bg-bg-secondary cursor-pointer"
              >
                Вийти
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="mx-auto w-full max-w-5xl flex-1 px-8 py-12">
        <div className="border border-border-custom bg-bg-card p-8">
          <h2 className="font-display text-xl font-medium text-text-primary mb-6 border-b border-border-custom pb-4">
            Особистий кабінет (Панель користувача)
          </h2>
          
          <div className="grid gap-6 md:grid-cols-2">
            {/* User Profile Info Card */}
            <div className="border border-border-custom bg-bg-secondary p-6">
              <h3 className="font-display text-xs font-semibold uppercase tracking-wider text-text-secondary mb-4">
                Інформація про профіль
              </h3>
              <dl className="space-y-3 font-mono text-sm">
                <div>
                  <dt className="text-text-muted text-xs">Email</dt>
                  <dd className="text-text-primary">{user.email}</dd>
                </div>
                <div>
                  <dt className="text-text-muted text-xs">Сайт</dt>
                  <dd className="text-text-primary">{user.websiteUrl || 'не вказано'}</dd>
                </div>
                <div>
                  <dt className="text-text-muted text-xs">Telegram ID</dt>
                  <dd className="text-text-primary">{user.telegramId.toString()}</dd>
                </div>
                {user.telegramUsername && (
                  <div>
                    <dt className="text-text-muted text-xs">Telegram Username</dt>
                    <dd className="text-text-primary">@{user.telegramUsername}</dd>
                  </div>
                )}
              </dl>
            </div>

            {/* API access details card */}
            <div className="border border-border-custom bg-bg-secondary p-6">
              <h3 className="font-display text-xs font-semibold uppercase tracking-wider text-text-secondary mb-4">
                API доступи
              </h3>
              <p className="text-xs text-text-secondary leading-relaxed mb-4">
                Для підключення Google Таблиць використовуйте ваш API-ключ. Ви можете переглянути його хеш нижче.
              </p>
              <div className="font-mono text-xs">
                <span className="text-text-muted block mb-1">Хеш API-ключа (SHA-256):</span>
                <span className="text-text-primary break-all bg-bg-card border border-border-custom p-2 block">
                  {user.apiKeyHash}
                </span>
              </div>
            </div>
          </div>

          {/* Billing Manager component */}
          <BillingManager subscription={subscriptionData} cards={cards} />
        </div>
      </main>
    </div>
  );
}

