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
  ssrAppUrl?: string;
}

export default function DashboardClient({ apiKeyHash, subscription, cards, ssrAppUrl }: DashboardClientProps) {
  const [activeTab, setActiveTab] = useState<'analytics' | 'integration' | 'instructions' | 'billing'>('analytics');

  const tabs = [
    { id: 'analytics', label: 'Аналітика' },
    { id: 'integration', label: 'Інтеграція' },
    { id: 'instructions', label: 'Інструкції' },
    { id: 'billing', label: 'Оплата' },
  ] as const;

  return (
    <div className="space-y-6">
      {/* Tabs navigation menu */}
      <div className="flex border-b border-border-custom gap-2 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-5 py-3 text-xs font-medium border-b-2 transition-all cursor-pointer whitespace-nowrap focus:outline-none ${
              activeTab === tab.id
                ? 'border-accent-blue text-accent-blue font-semibold bg-bg-secondary/40'
                : 'border-transparent text-text-secondary hover:text-text-primary hover:border-border-custom'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Render active tab */}
      <div className="pt-2">
        {activeTab === 'analytics' && <AnalyticsTab />}
        {activeTab === 'integration' && <IntegrationTab initialApiKeyHash={apiKeyHash} ssrAppUrl={ssrAppUrl} />}
        {activeTab === 'instructions' && <InstructionsTab />}
        {activeTab === 'billing' && <BillingManager subscription={subscription} cards={cards} />}
      </div>
    </div>
  );
}
