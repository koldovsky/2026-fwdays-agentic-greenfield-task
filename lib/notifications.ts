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
 * Formats a Date object or ISO string to Kyiv date-time format: DD.MM.YYYY HH:MM.
 */
export function formatKyivDateTime(dateInput: Date | string | undefined | null): string {
  if (!dateInput) return 'не вказано';
  if (dateInput === 'не вказано' || dateInput === 'не знайдено') {
    return dateInput;
  }
  try {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    if (isNaN(date.getTime())) {
      return 'не вказано';
    }
    const parts = new Intl.DateTimeFormat('uk-UA', {
      timeZone: 'Europe/Kyiv',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(date);
    const day = parts.find((p) => p.type === 'day')?.value;
    const month = parts.find((p) => p.type === 'month')?.value;
    const year = parts.find((p) => p.type === 'year')?.value;
    const hour = parts.find((p) => p.type === 'hour')?.value;
    const minute = parts.find((p) => p.type === 'minute')?.value;
    return `${day}.${month}.${year} ${hour}:${minute}`;
  } catch {
    return 'не вказано';
  }
}

/**
 * Escapes special HTML characters to prevent parsing issues in Telegram API.
 */
export function escapeHtml(str: string | undefined | null): string {
  if (!str) return 'не вказано';
  if (str === 'не вказано' || str === 'не знайдено') return str;
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Sends a calm Telegram notification to the administrator about subscription lifecycle events.
 */
export async function sendAdminAlert(data: AdminAlertData) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const adminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID;

  if (!token) {
    console.warn('TELEGRAM_BOT_TOKEN is not configured, skipping admin alert');
    return;
  }
  if (!adminChatId) {
    console.warn('TELEGRAM_ADMIN_CHAT_ID is not configured, skipping admin alert');
    return;
  }

  const currentDate = formatKyivDateTime(new Date());
  const eventName = escapeHtml(data.event);
  const name = escapeHtml(data.name);
  const website = escapeHtml(data.website);
  const phone = escapeHtml(data.phone);
  const email = escapeHtml(data.email);
  const time = formatKyivDateTime(data.time);
  const amountStr = data.amount !== undefined ? `\nСума: ${(data.amount / 100).toFixed(2)} UAH` : '';

  let telegramHandle = 'не вказано';
  if (data.telegramUsername) {
    if (data.telegramUsername === 'не знайдено' || data.telegramUsername === 'не вказано') {
      telegramHandle = data.telegramUsername;
    } else {
      const cleanUsername = data.telegramUsername.replace(/^@/, '');
      telegramHandle = `@${escapeHtml(cleanUsername)}`;
    }
  }

  const text = `Подія: ${eventName}
Дата: ${currentDate}

Дані клієнта:
Ім'я: ${name}
Сайт: ${website}
Телефон: ${phone}
Пошта: ${email}
Час: ${time}
Telegram: ${telegramHandle}${amountStr}`;

  try {
    await sendBotMessage(adminChatId, text, 'HTML');
  } catch (err) {
    console.error('Failed to send admin Telegram alert:', err);
  }
}

export type UserAlertEvent = 'welcome' | 'payment_failed' | 'paused' | 'suspended_cancelled';

/**
 * Sends a calm Telegram notification to the user about subscription events.
 */
export async function sendUserAlert(telegramId: string | bigint | undefined | null, event: UserAlertEvent) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.warn('TELEGRAM_BOT_TOKEN is not configured, skipping user alert');
    return;
  }
  if (!telegramId) {
    console.warn('telegramId is not provided, skipping user alert');
    return;
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const dashboardLink = `${appUrl}/dashboard`;
  const escapedLink = escapeHtml(dashboardLink);

  let text = '';
  switch (event) {
    case 'welcome':
      text = `Вітаємо з успішним оформленням підписки. Для налаштування інтеграції скористайтеся інструкцією в особистому кабінеті: ${escapedLink}`;
      break;
    case 'payment_failed':
      text = `Автоматична спроба списання плати за підписку була неуспішною. Будь ласка, оновіть дані вашої картки в особистому кабінеті, щоб запобігти призупиненню сервісу: ${escapedLink}`;
      break;
    case 'paused':
      text = `Вашу підписку призупинено. Ви можете поновити її в будь-який час в особистому кабінеті: ${escapedLink}`;
      break;
    case 'suspended_cancelled':
      text = `Надання послуг з передачі конверсій призупинено. Для відновлення роботи сервісу оновіть платіжні дані або здійсніть оплату в особистому кабінеті: ${escapedLink}`;
      break;
  }

  try {
    await sendBotMessage(telegramId, text, 'HTML');
  } catch (err) {
    console.error(`Failed to send user Telegram alert (${event}):`, err);
  }
}
