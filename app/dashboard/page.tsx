import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { sessions, users, subscriptions } from '@/db/schema';
import { eq } from 'drizzle-orm';
import DashboardClient from './DashboardClient';
import { SubscriptionData, WalletCard } from './BillingManager';
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
          
          <DashboardClient apiKeyHash={user.apiKeyHash} subscription={subscriptionData} cards={cards} />
        </div>
      </main>
    </div>
  );
}

