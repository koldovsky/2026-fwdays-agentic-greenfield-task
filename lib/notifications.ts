import { sendBotMessage } from './telegram-bot';

export interface AdminAlertData {
  event: 'Нова підписка' | 'Платіж отримано' | 'Скасування підписки' | 'Пауза підписки' | 'Поновлення підписки';
  name?: string;
  phone?: string;
  time?: string;
  email: string;
  website: string;
  telegramUsername?: string | null;
  amount?: number; // Optional: in kopecks
}

/**
 * Sends a calm Telegram notification to the administrator about subscription lifecycle events.
 */
export async function sendAdminAlert(data: AdminAlertData) {
  const adminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID;
  if (!adminChatId) {
    console.warn('TELEGRAM_ADMIN_CHAT_ID is not configured, skipping admin alert');
    return;
  }

  const currentDate = new Date().toLocaleDateString('uk-UA');
  const amountStr = data.amount !== undefined ? `\nСума: ${(data.amount / 100).toFixed(2)} UAH` : '';
  const telegramHandle = data.telegramUsername ? `@${data.telegramUsername}` : 'не вказано';

  const text = `Подія: ${data.event}
Дата: ${currentDate}

Дані клієнта:
Ім'я: ${data.name || 'не вказано'}
Сайт: ${data.website || 'не вказано'}
Телефон: ${data.phone || 'не вказано'}
Пошта: ${data.email || 'не вказано'}
Час: ${data.time || 'не вказано'}
Telegram: ${telegramHandle}${amountStr}`;

  try {
    await sendBotMessage(adminChatId, text);
  } catch (err) {
    console.error('Failed to send admin Telegram alert:', err);
  }
}

export type UserAlertEvent = 'welcome' | 'payment_failed' | 'paused' | 'suspended_cancelled';

/**
 * Sends a calm Telegram notification to the user about subscription events.
 */
export async function sendUserAlert(telegramId: string | bigint, event: UserAlertEvent) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const dashboardLink = `${appUrl}/dashboard`;

  let text = '';
  switch (event) {
    case 'welcome':
      text = `Вітаємо з успішним оформленням підписки. Для налаштування інтеграції скористайтеся інструкцією в особистому кабінеті: ${dashboardLink}`;
      break;
    case 'payment_failed':
      text = `Автоматична спроба списання плати за підписку була неуспішною. Будь ласка, оновіть дані вашої картки в особистому кабінеті, щоб запобігти призупиненню сервісу: ${dashboardLink}`;
      break;
    case 'paused':
      text = `Вашу підписку призупинено. Ви можете поновити її в будь-який час в особистому кабінеті: ${dashboardLink}`;
      break;
    case 'suspended_cancelled':
      text = `Надання послуг з передачі конверсій призупинено. Для відновлення роботи сервісу оновіть платіжні дані або здійсніть оплату в особистому кабінеті: ${dashboardLink}`;
      break;
  }

  try {
    await sendBotMessage(telegramId, text);
  } catch (err) {
    console.error(`Failed to send user Telegram alert (${event}):`, err);
  }
}
