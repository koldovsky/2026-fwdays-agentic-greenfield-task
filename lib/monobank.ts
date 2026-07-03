import crypto from 'crypto';

const MONOBANK_API_URL = 'https://api.monobank.ua';

let cachedPubKey: string | null = null;

export interface CreateInvoiceResponse {
  invoiceId: string;
  pageUrl: string;
}

export interface WalletPaymentResponse {
  invoiceId: string;
  status: 'processing' | 'success' | 'failure';
  amount: number;
  ccy: number;
  createdDate: string;
  modifiedDate: string;
  failureReason?: string | null;
  tdsUrl?: string | null;
}

export interface InvoiceStatusResponse {
  invoiceId: string;
  status: 'created' | 'processing' | 'hold' | 'success' | 'failure' | 'reversed' | 'expired';
  amount: number;
  ccy: number;
  modifiedDate?: string;
  createdDate?: string;
  errCode?: string;
  failureReason?: string;
  walletData?: {
    cardToken: string;
    walletId: string;
    status: 'new' | 'created' | 'failed';
  } | null;
  paymentInfo?: {
    maskedPan: string;
    approvalCode?: string;
    rrn?: string;
    tranId?: string;
    terminal: string;
    bank?: string;
    paymentSystem: string;
    paymentMethod: string;
    country?: string;
    fee?: number;
    agentFee?: number;
  } | null;
}

export interface MonobankCurrencyItem {
  currencyCodeA: number;
  currencyCodeB: number;
  date: number;
  rateSell?: number;
  rateBuy?: number;
  rateCross?: number;
}

interface ExchangeRateCache {
  rate: number;
  fetchedAt: number;
}

let cachedExchangeRate: ExchangeRateCache | null = null;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Fetches the public key from Monobank.
 */
async function fetchPublicKey(): Promise<string> {
  const token = process.env.MONOBANK_TOKEN;
  if (!token) throw new Error('MONOBANK_TOKEN is not configured');

  const res = await fetch(`${MONOBANK_API_URL}/api/merchant/pubkey`, {
    headers: { 'X-Token': token }
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch public key from Monobank: ${res.status}`);
  }
  const data = await res.json();
  return Buffer.from(data.key, 'base64').toString('utf-8');
}

/**
 * Verifies webhook signature header against the raw body bytes.
 */
export async function verifyWebhookSignature(
  xSignBase64: string | null | undefined,
  rawBody: Buffer | string
): Promise<boolean> {
  if (!xSignBase64) return false;

  const bodyBytes = typeof rawBody === 'string' ? Buffer.from(rawBody, 'utf-8') : rawBody;

  const doVerify = (pemKey: string) => {
    try {
      const verifier = crypto.createVerify('SHA256');
      verifier.update(bodyBytes);
      return verifier.verify(pemKey, xSignBase64, 'base64');
    } catch (err) {
      console.error('Crypto webhook verification error:', err);
      return false;
    }
  };

  // 1. Verify with cached key
  if (cachedPubKey) {
    const verified = doVerify(cachedPubKey);
    if (verified) return true;
    console.warn('Verification with cached public key failed. Retrying key rotation.');
  }

  // 2. Fetch fresh key and retry once
  try {
    const freshKey = await fetchPublicKey();
    const verified = doVerify(freshKey);
    if (verified) {
      cachedPubKey = freshKey;
      return true;
    }
  } catch (err) {
    console.error('Failed to fetch fresh public key:', err);
    // Fallback to cached key if API is down
    if (cachedPubKey) {
      console.log('Falling back to cached public key.');
      return doVerify(cachedPubKey);
    }
  }

  return false;
}

/**
 * Fetches current dynamic exchange rate (USD to UAH rateSell).
 * Caches rate for 1 hour. Falls back to stale cache or hardcoded 41.5 UAH/USD.
 */
export async function getExchangeRate(): Promise<number> {
  const now = Date.now();
  if (cachedExchangeRate && (now - cachedExchangeRate.fetchedAt < CACHE_TTL_MS)) {
    return cachedExchangeRate.rate;
  }

  try {
    const res = await fetch(`${MONOBANK_API_URL}/bank/currency`);
    if (!res.ok) {
      throw new Error(`Monobank currency API returned status ${res.status}`);
    }
    const data = await res.json() as MonobankCurrencyItem[];
    const usdRate = data.find((item: MonobankCurrencyItem) => item.currencyCodeA === 840 && item.currencyCodeB === 980);
    if (usdRate && usdRate.rateSell) {
      cachedExchangeRate = {
        rate: usdRate.rateSell,
        fetchedAt: now,
      };
      return usdRate.rateSell;
    }
    throw new Error('USD/UAH currency rate not found in response');
  } catch (err) {
    console.error('Error fetching exchange rate:', err);
    if (cachedExchangeRate) {
      console.log('Using stale cached exchange rate:', cachedExchangeRate.rate);
      return cachedExchangeRate.rate;
    }
    console.log('Using hardcoded fallback exchange rate: 41.5');
    return 41.5;
  }
}

/**
 * Creates an invoice for subscription tariff plan.
 */
export async function createInvoice(
  amount: number,
  redirectUrl?: string,
  webHookUrl?: string
): Promise<CreateInvoiceResponse> {
  const token = process.env.MONOBANK_TOKEN;
  if (!token) throw new Error('MONOBANK_TOKEN is not configured');

  const payload = {
    amount,
    ccy: 980,
    redirectUrl,
    webHookUrl,
    saveCardData: {
      saveCard: true
    }
  };

  const res = await fetch(`${MONOBANK_API_URL}/api/merchant/invoice/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Token': token
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to create Monobank invoice: ${res.status} - ${errText}`);
  }

  return res.json();
}

/**
 * Executes token-based payment (merchant-initiated).
 */
export async function executeWalletPayment(
  cardToken: string,
  amount: number,
  redirectUrl?: string,
  webHookUrl?: string
): Promise<WalletPaymentResponse> {
  const token = process.env.MONOBANK_TOKEN;
  if (!token) throw new Error('MONOBANK_TOKEN is not configured');

  const payload = {
    cardToken,
    amount,
    ccy: 980,
    initiationKind: 'merchant',
    redirectUrl,
    webHookUrl
  };

  const res = await fetch(`${MONOBANK_API_URL}/api/merchant/wallet/payment`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Token': token
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to execute wallet payment: ${res.status} - ${errText}`);
  }

  return res.json();
}

/**
 * Deletes card from the Monobank wallet using cardToken.
 */
export async function deleteCard(cardToken: string): Promise<void> {
  const token = process.env.MONOBANK_TOKEN;
  if (!token) throw new Error('MONOBANK_TOKEN is not configured');

  const url = new URL(`${MONOBANK_API_URL}/api/merchant/wallet/card`);
  url.searchParams.set('cardToken', cardToken);

  const res = await fetch(url.toString(), {
    method: 'DELETE',
    headers: {
      'X-Token': token
    }
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to delete card token: ${res.status} - ${errText}`);
  }
}

/**
 * Checks status of invoice (polling).
 */
export async function getInvoiceStatus(invoiceId: string): Promise<InvoiceStatusResponse> {
  const token = process.env.MONOBANK_TOKEN;
  if (!token) throw new Error('MONOBANK_TOKEN is not configured');

  const url = new URL(`${MONOBANK_API_URL}/api/merchant/invoice/status`);
  url.searchParams.set('invoiceId', invoiceId);

  const res = await fetch(url.toString(), {
    headers: {
      'X-Token': token
    }
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to fetch invoice status: ${res.status} - ${errText}`);
  }

  return res.json();
}

export interface WalletCardItem {
  cardToken: string;
  maskedPan: string;
  country?: string;
}

/**
 * Fetches the list of cards in a buyer's wallet.
 */
export async function getWalletCards(walletId: string): Promise<WalletCardItem[]> {
  const token = process.env.MONOBANK_TOKEN;
  if (!token) return [];

  const url = new URL(`${MONOBANK_API_URL}/api/merchant/wallet`);
  url.searchParams.set('walletId', walletId);

  const res = await fetch(url.toString(), {
    headers: {
      'X-Token': token
    }
  });

  if (!res.ok) {
    console.error(`Failed to fetch wallet cards: ${res.status}`);
    return [];
  }

  const data = await res.json();
  return data.wallet || [];
}

