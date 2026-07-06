import { getExchangeRate } from './monobank';

export interface PricingDetails {
  amountInKopecks: number;
  exchangeRate: number;
  appUrl: string;
  webHookUrl: string;
  redirectUrl: string;
}

export async function getPricingDetails(tariffPlan: 'monthly' | 'yearly'): Promise<PricingDetails> {
  const exchangeRate = await getExchangeRate();
  const usdPrice = tariffPlan === 'monthly' ? 10.99 : 120.00;
  const amountInKopecks = Math.round(usdPrice * exchangeRate * 100);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const webHookUrl = process.env.MONOBANK_WEBHOOK_URL || `${appUrl}/api/billing/webhook`;
  const redirectUrl = `${appUrl}/dashboard`;

  return {
    amountInKopecks,
    exchangeRate,
    appUrl,
    webHookUrl,
    redirectUrl,
  };
}
