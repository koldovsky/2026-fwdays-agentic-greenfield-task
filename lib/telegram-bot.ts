import { db } from '@/db';
import { users, pendingRegistrations, magicLinks } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import crypto from 'crypto';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

const nextSendTimeByChat = new Map<string, number>();
let nextOverallSendTime = 0;

async function enforceRateLimits(chatId: string) {
  const now = Date.now();

  let scheduledOverall = nextOverallSendTime;
  if (scheduledOverall < now) {
    scheduledOverall = now;
  }
  nextOverallSendTime = scheduledOverall + 34; // макс 30 повідомлень на секунду загалом

  let scheduledChat = nextSendTimeByChat.get(chatId) || 0;
  if (scheduledChat < now) {
    scheduledChat = now;
  }
  nextSendTimeByChat.set(chatId, scheduledChat + 1000); // макс 1 повідомлення на секунду для конкретного чату

  const executeTime = Math.max(scheduledOverall, scheduledChat);
  const delay = executeTime - now;

  if (delay > 0) {
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
}

export async function sendBotMessage(
  telegramId: string | bigint,
  text: string,
  parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2'
): Promise<boolean> {
  if (!TELEGRAM_BOT_TOKEN) {
    console.error('TELEGRAM_BOT_TOKEN is not configured');
    throw new Error('TELEGRAM_BOT_TOKEN is not configured');
  }

  const chatIdStr = telegramId.toString();
  await enforceRateLimits(chatIdStr);

  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatIdStr,
        text,
        ...(parseMode ? { parse_mode: parseMode } : {}),
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Telegram API error response:', errorData);
      throw new Error(`Telegram API returned status ${response.status}`);
    }

    return true;
  } catch (error) {
    console.error('Failed to send Telegram message:', error);
    throw error;
  }
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
}

export function validateWebsiteUrl(url: string): boolean {
  // Regex to validate standard domain / URL structure
  const urlRegex = /^(https?:\/\/)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(\/.*)?$/;
  return urlRegex.test(url);
}

export function normalizeWebsiteUrl(url: string): string {
  let normalized = url.trim();
  if (!/^https?:\/\//i.test(normalized)) {
    normalized = `https://${normalized}`;
  }
  return normalized;
}
export interface TelegramUpdate {
  message?: {
    message_id: number;
    from: {
      id: number;
      username?: string;
    };
    chat: {
      type: string;
    };
    text?: string;
  };
}

export async function handleBotUpdate(update: TelegramUpdate) {
  const message = update.message;
  if (!message || !message.chat || message.chat.type !== 'private') {
    return;
  }

  const telegramId = BigInt(message.from.id);
  const telegramUsername = message.from.username || null;
  const text = message.text?.trim();

  if (!text) {
    return;
  }

  // Handle /cancel command
  if (text.toLowerCase() === '/cancel') {
    const activeReg = await db
      .select()
      .from(pendingRegistrations)
      .where(
        and(
          eq(pendingRegistrations.telegramId, BigInt(telegramId)),
          eq(pendingRegistrations.isCompleted, false)
        )
      )
      .limit(1);

    if (activeReg.length > 0) {
      await db
        .delete(pendingRegistrations)
        .where(eq(pendingRegistrations.id, activeReg[0].id));
    }

    await sendBotMessage(
      telegramId,
      'Реєстрацію скасовано. Ви можете почати знову, перейшовши за посиланням з сайту'
    );
    return;
  }

  // Handle /start command with registration token prefix (reg_)
  if (text.startsWith('/start')) {
    const match = text.match(/^\/start reg_([a-f0-9-]+)$/i);
    if (match) {
      const token = match[1];
      const now = new Date();

      const pendingReg = await db
        .select()
        .from(pendingRegistrations)
        .where(eq(pendingRegistrations.token, token))
        .limit(1);

      if (pendingReg.length === 0 || pendingReg[0].expiresAt < now) {
        await sendBotMessage(
          telegramId,
          'Дія посилання для реєстрації закінчилася або воно недійсне. Будь ласка, почніть реєстрацію спочатку на сайті'
        );
        return;
      }

      if (pendingReg[0].isCompleted) {
        await sendBotMessage(
          telegramId,
          'Ця реєстрація вже завершена. Будь ласка, виконайте вхід на сайті'
        );
        return;
      }

      // Associate registration with this Telegram user
      await db
        .update(pendingRegistrations)
        .set({
          telegramId: BigInt(telegramId),
          telegramUsername,
        })
        .where(eq(pendingRegistrations.id, pendingReg[0].id));

      await sendBotMessage(
        telegramId,
        'Будь ласка, введіть вашу електронну адресу (email)'
      );
      return;
    } else {
      await sendBotMessage(
        telegramId,
        'Вітаємо. Будь ласка, скористайтеся посиланням для реєстрації з нашого сайту'
      );
      return;
    }
  }

  // Handle sequential registration conversations
  const activeReg = await db
    .select()
    .from(pendingRegistrations)
    .where(
      and(
        eq(pendingRegistrations.telegramId, BigInt(telegramId)),
        eq(pendingRegistrations.isCompleted, false)
      )
    )
    .limit(1);

  if (activeReg.length > 0) {
    const reg = activeReg[0];
    const now = new Date();

    if (reg.expiresAt < now) {
      await db
        .delete(pendingRegistrations)
        .where(eq(pendingRegistrations.id, reg.id));
      await sendBotMessage(
        telegramId,
        'Дія посилання для реєстрації закінчилася. Будь ласка, почніть реєстрацію спочатку на сайті'
      );
      return;
    }

    // Step 1: Email collection
    if (!reg.email) {
      if (!validateEmail(text)) {
        await sendBotMessage(
          telegramId,
          'Введена адреса електронної пошти некоректна. Будь ласка, введіть вашу електронну адресу (email) ще раз'
        );
        return;
      }

      // Check if email already registered in the users table
      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.email, text.toLowerCase()))
        .limit(1);

      if (existingUser.length > 0) {
        await sendBotMessage(
          telegramId,
          'Користувач із такою електронною поштою вже зареєстрований. Будь ласка, введіть іншу адресу'
        );
        return;
      }

      await db
        .update(pendingRegistrations)
        .set({ email: text.toLowerCase() })
        .where(eq(pendingRegistrations.id, reg.id));

      await sendBotMessage(
        telegramId,
        'Будь ласка, введіть адресу вашого сайту (website URL)'
      );
      return;
    }

    // Step 2: Website URL collection
    if (!reg.websiteUrl) {
      if (!validateWebsiteUrl(text)) {
        await sendBotMessage(
          telegramId,
          'Введена адреса сайту некоректна. Будь ласка, введіть адресу вашого сайту (website URL) ще раз'
        );
        return;
      }

      const normalizedUrl = normalizeWebsiteUrl(text);

      // Check if Telegram user is already registered in users table
      const existingUserTelegram = await db
        .select()
        .from(users)
        .where(eq(users.telegramId, BigInt(telegramId)))
        .limit(1);

      if (existingUserTelegram.length > 0) {
        await sendBotMessage(
          telegramId,
          'Ваш Telegram-акаунт уже повʼязаний з іншим профілем. Зверніться до підтримки'
        );
        return;
      }

      // Create new user in users table
      const rawApiKey = 'apiKey_' + crypto.randomBytes(24).toString('hex');
      const apiKeyHash = crypto.createHash('sha256').update(rawApiKey).digest('hex');

      try {
        const newUserList = await db
          .insert(users)
          .values({
            telegramId: BigInt(telegramId),
            telegramUsername: reg.telegramUsername,
            email: reg.email,
            websiteUrl: normalizedUrl,
            apiKeyHash,
          })
          .returning();

        const newUser = newUserList[0];

        // Mark registration as completed
        await db
          .update(pendingRegistrations)
          .set({
            websiteUrl: normalizedUrl,
            isCompleted: true,
          })
          .where(eq(pendingRegistrations.id, reg.id));

        // Generate magic link
        const magicToken = crypto.randomUUID();
        const magicExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

        await db.insert(magicLinks).values({
          userId: newUser.id,
          token: magicToken,
          expiresAt: magicExpires,
        });

        const magicLinkUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/magic?token=${magicToken}`;

        await sendBotMessage(
          telegramId,
          `Реєстрацію завершено. Ось ваше посилання для входу: ${magicLinkUrl}`
        );
      } catch (dbError) {
        console.error('Error during database user insertion:', dbError);
        await sendBotMessage(
          telegramId,
          'Виникла помилка під час реєстрації в базі даних. Спробуйте пізніше'
        );
      }
      return;
    }
  }

  // Default response for unhandled private messages
  await sendBotMessage(
    telegramId,
    'Для входу або реєстрації скористайтеся сайтом платформи'
  );
}
