import { NextResponse } from 'next/server';
import { handleBotUpdate } from '@/lib/telegram-bot';
import crypto from 'crypto';

export async function POST(request: Request) {
  const secretToken = request.headers.get('X-Telegram-Bot-Api-Secret-Token') || '';
  const configuredSecret = process.env.TELEGRAM_BOT_WEBHOOK_SECRET || '';

  const secretTokenHash = crypto.createHash('sha256').update(secretToken).digest();
  const configuredSecretHash = crypto.createHash('sha256').update(configuredSecret).digest();

  const isAuthorized = crypto.timingSafeEqual(secretTokenHash, configuredSecretHash);

  if (!process.env.TELEGRAM_BOT_WEBHOOK_SECRET || !request.headers.get('X-Telegram-Bot-Api-Secret-Token') || !isAuthorized) {
    console.warn('Unauthorized webhook request rejected');
    return new NextResponse('Unauthorized', { status: 403 });
  }

    try {
      const update = await request.json();
      await handleBotUpdate(update);
      return NextResponse.json({ ok: true });
    } catch (error) {
      console.error('Error handling webhook update:', error);
      // Return 200 to Telegram Bot API even on errors to prevent it from retrying and flooding the webhook
      return NextResponse.json({ ok: false, error: 'Internal Server Error' }, { status: 200 });
    }
  }
