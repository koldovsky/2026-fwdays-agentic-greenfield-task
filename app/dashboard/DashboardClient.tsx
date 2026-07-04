'use client';

import { useState } from 'react';
import AnalyticsTab from './AnalyticsTab';
import IntegrationTab from './IntegrationTab';
import InstructionsTab from './InstructionsTab';
import BillingManager, { SubscriptionData, WalletCard } from './BillingManager';

interface DashboardClientProps {
  apiKeyHash: string;
  subscription: SubscriptionData | null;
  cards: WalletCard[];
}

export default function DashboardClient({ apiKeyHash, subscription, cards }: DashboardClientProps) {
  const [activeTab, setActiveTab] = useState<'analytics' | 'integration' | 'instructions' | 'billing'>('analytics');

  return (
    <div className="space-y-6">
      {/* Tabs navigation menu */}
      <div className="flex border-b border-border-custom gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('analytics')}
          className={`px-5 py-3 text-xs font-medium border-b-2 transition-all cursor-pointer whitespace-nowrap focus:outline-none ${
            activeTab === 'analytics'
              ? 'border-accent-blue text-accent-blue font-semibold bg-bg-secondary/40'
              : 'border-transparent text-text-secondary hover:text-text-primary hover:border-border-custom'
          }`}
        >
          Аналітика
        </button>
        <button
          onClick={() => setActiveTab('integration')}
          className={`px-5 py-3 text-xs font-medium border-b-2 transition-all cursor-pointer whitespace-nowrap focus:outline-none ${
            activeTab === 'integration'
              ? 'border-accent-blue text-accent-blue font-semibold bg-bg-secondary/40'
              : 'border-transparent text-text-secondary hover:text-text-primary hover:border-border-custom'
          }`}
        >
          Інтеграція
        </button>
        <button
          onClick={() => setActiveTab('instructions')}
          className={`px-5 py-3 text-xs font-medium border-b-2 transition-all cursor-pointer whitespace-nowrap focus:outline-none ${
            activeTab === 'instructions'
              ? 'border-accent-blue text-accent-blue font-semibold bg-bg-secondary/40'
              : 'border-transparent text-text-secondary hover:text-text-primary hover:border-border-custom'
          }`}
        >
          Інструкції
        </button>
        <button
          onClick={() => setActiveTab('billing')}
          className={`px-5 py-3 text-xs font-medium border-b-2 transition-all cursor-pointer whitespace-nowrap focus:outline-none ${
            activeTab === 'billing'
              ? 'border-accent-blue text-accent-blue font-semibold bg-bg-secondary/40'
              : 'border-transparent text-text-secondary hover:text-text-primary hover:border-border-custom'
          }`}
        >
          Оплата
        </button>
      </div>

      {/* Render active tab */}
      <div className="pt-2">
        {activeTab === 'analytics' && <AnalyticsTab />}
        {activeTab === 'integration' && <IntegrationTab initialApiKeyHash={apiKeyHash} />}
        {activeTab === 'instructions' && <InstructionsTab />}
        {activeTab === 'billing' && <BillingManager subscription={subscription} cards={cards} />}
      </div>
    </div>
  );
}
