import { NextResponse } from 'next/server';
  import { handleBotUpdate } from '@/lib/telegram-bot';

  export async function POST(request: Request) {
    const secretToken = request.headers.get('X-Telegram-Bot-Api-Secret-Token');
    const configuredSecret = process.env.TELEGRAM_BOT_WEBHOOK_SECRET;

    if (!configuredSecret || secretToken !== configuredSecret) {
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
