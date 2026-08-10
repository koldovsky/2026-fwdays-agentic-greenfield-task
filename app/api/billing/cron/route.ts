import { NextResponse } from 'next/server';
import { runBillingCron } from '@/scripts/billing-cron';

export async function GET() {
  try {
    await runBillingCron();
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Cron API error:', err);
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
