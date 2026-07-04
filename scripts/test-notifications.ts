process.env.DATABASE_URL = 'postgres://dummy:dummy@localhost:5432/dummy';
import { sendAdminAlert, sendUserAlert, formatKyivDateTime } from '../lib/notifications';

// -------------------------------------------------------------
// Тестовий фреймворк для перехоплення Telegram API запитів
// -------------------------------------------------------------

const capturedMessages: { chatId: string; text: string; parseMode?: string; timestamp: number }[] = [];
let mockFetchStatus: number = 200;
let mockFetchResponse: unknown = { ok: true };

// Заміна глобального fetch
const originalFetch = globalThis.fetch;
globalThis.fetch = (async (url: string, init?: RequestInit) => {
  const urlStr = url.toString();
  if (urlStr.startsWith('https://api.telegram.org')) {
    const timestamp = Date.now();
    const body = init?.body ? JSON.parse(init.body.toString()) : {};
    
    capturedMessages.push({
      chatId: body.chat_id,
      text: body.text,
      parseMode: body.parse_mode,
      timestamp
    });

    if (mockFetchStatus === 200) {
      return {
        ok: true,
        status: mockFetchStatus,
        json: async () => ({ ok: true, result: {} })
      } as Response;
    } else {
      return {
        ok: false,
        status: mockFetchStatus,
        json: async () => mockFetchResponse
      } as Response;
    }
  }
  return originalFetch(url, init);
}) as typeof globalThis.fetch;

// Налаштування фіктивних змінних оточення для тестів
process.env.TELEGRAM_BOT_TOKEN = '123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11';
process.env.TELEGRAM_ADMIN_CHAT_ID = '-100123456789';

async function runTests() {
  console.log('=== ЗАПУСК ТЕСТІВ ТЕЛЕГРАМ-СПОВІЩЕНЬ ===\n');
  let failed = false;

  const assert = (condition: boolean, message: string) => {
    if (!condition) {
      console.error(`❌ ТЕСТ ПРОВАЛЕНО: ${message}`);
      failed = true;
    } else {
      console.log(`✅ ТЕСТ ПРОЙДЕНО: ${message}`);
    }
  };

  // -------------------------------------------------------------
  // Тест 1: Форматування дати за Київським часом
  // -------------------------------------------------------------
  console.log('\n--- Тест 1: formatKyivDateTime ---');
  // Тестуємо фіксовану дату (UTC)
  const testDate = new Date('2026-07-04T16:30:00.000Z'); // 16:30 UTC = 19:30 за Києвом (літо, UTC+3)
  const formatted = formatKyivDateTime(testDate);
  assert(formatted === '04.07.2026 19:30', `Дата має бути "04.07.2026 19:30", отримано: "${formatted}"`);
  
  // Перевірка порожніх значень
  assert(formatKyivDateTime(null) === 'не вказано', 'Null має повертати "не вказано"');
  assert(formatKyivDateTime('не знайдено') === 'не знайдено', 'Маркер "не знайдено" має повертатись без змін');

  // -------------------------------------------------------------
  // Тест 2: Сповіщення адміністратора з різними варіантами даних
  // -------------------------------------------------------------
  console.log('\n--- Тест 2: sendAdminAlert (Шаблони та Тон) ---');
  capturedMessages.length = 0;

  // Випадок А: Усі дані вказані, включаючи HTML символи
  await sendAdminAlert({
    event: 'Нова підписка',
    name: 'Іван <Тестер> & Co',
    phone: '+380501234567',
    time: '2026-07-04T16:30:00.000Z',
    email: 'ivan@example.com',
    website: 'https://mysite.com?a=1&b=2',
    telegramUsername: 'ivan_tg',
    amount: 1099 // $10.99
  });

  assert(capturedMessages.length === 1, 'Має бути відправлено 1 повідомлення');
  const msg1 = capturedMessages[0];
  assert(msg1.chatId === '-100123456789', 'ID чату адміна має співпадати');
  assert(msg1.parseMode === 'HTML', 'Режим розмітки має бути HTML');
  assert(!msg1.text.includes('!'), 'Повідомлення не повинно містити знаків оклику');
  assert(msg1.text.includes('Подія: Нова підписка'), 'Має містити назву події');
  assert(msg1.text.includes("Ім'я: Іван &lt;Тестер&gt; &amp; Co"), 'Ім\'я має бути екрановане HTML');
  assert(msg1.text.includes('Сайт: https://mysite.com?a=1&amp;b=2'), 'Сайт має бути екранований HTML');
  assert(msg1.text.includes('Telegram: @ivan_tg'), 'Telegram-нік має містити символ @');
  assert(msg1.text.includes('Сума: 10.99 UAH'), 'Має містити правильну суму в UAH');
  assert(msg1.text.includes('Час: 04.07.2026 19:30'), 'Час події має бути відформатований');

  // Випадок Б: Користувача не знайдено в БД (маркери "не знайдено")
  capturedMessages.length = 0;
  await sendAdminAlert({
    event: 'Платіж отримано',
    name: 'Петро',
    phone: '+380500000000',
    time: '2026-07-04T16:30:00.000Z',
    email: 'не знайдено',
    website: 'не знайдено',
    telegramUsername: 'не знайдено',
    amount: 12000 // 120.00
  });

  assert(capturedMessages.length === 1, 'Має бути відправлено 1 повідомлення');
  const msg2 = capturedMessages[0];
  assert(msg2.text.includes('Пошта: не знайдено'), 'Email має бути "не знайдено"');
  assert(msg2.text.includes('Сайт: не знайдено'), 'Сайт має бути "не знайдено"');
  assert(msg2.text.includes('Telegram: не знайдено'), 'Telegram має бути "не знайдено" без символу @');

  // Випадок В: Деякі поля не вказані (маркери "не вказано")
  capturedMessages.length = 0;
  await sendAdminAlert({
    event: 'Скасування підписки',
    email: 'test@test.com',
    website: 'test.com',
  });
  const msg3 = capturedMessages[0];
  assert(msg3.text.includes("Ім'я: не вказано"), "Ім'я за замовчуванням має бути не вказано");
  assert(msg3.text.includes('Телефон: не вказано'), 'Телефон за замовчуванням має бути не вказано');
  assert(msg3.text.includes('Час: не вказано'), 'Час за замовчуванням має бути не вказано');
  assert(msg3.text.includes('Telegram: не вказано'), 'Telegram за замовчуванням має бути не вказано без символу @');

  // -------------------------------------------------------------
  // Тест 3: Сповіщення користувачів
  // -------------------------------------------------------------
  console.log('\n--- Тест 3: sendUserAlert ---');
  capturedMessages.length = 0;

  await sendUserAlert('987654321', 'welcome');
  await sendUserAlert('987654321', 'payment_failed');
  await sendUserAlert('987654321', 'paused');
  await sendUserAlert('987654321', 'suspended_cancelled');

  assert(capturedMessages.length === 4, 'Має бути відправлено 4 повідомлення користувачу');
  capturedMessages.forEach((msg, idx) => {
    assert(msg.chatId === '987654321', `Чат ID для повідомлення ${idx+1} має бути 987654321`);
    assert(msg.parseMode === 'HTML', `Розмітка повідомлення ${idx+1} має бути HTML`);
    assert(!msg.text.includes('!'), `Повідомлення ${idx+1} не має містити знаків оклику`);
    assert(msg.text.includes('http://localhost:3000/dashboard'), `Повідомлення ${idx+1} має містити лінк на особистий кабінет`);
  });

  // -------------------------------------------------------------
  // Тест 4: Перевірка Rate Limiting (Обмеження частоти повідомлень)
  // -------------------------------------------------------------
  console.log('\n--- Тест 4: Rate Limiting ---');
  capturedMessages.length = 0;

  console.log('Надсилаємо 3 повідомлення підряд в один чат (має бути штучна затримка по 1000 мс)...');
  const startTime = Date.now();
  
  await Promise.all([
    sendUserAlert('111111', 'welcome'),
    sendUserAlert('111111', 'welcome'),
    sendUserAlert('111111', 'welcome')
  ]);
  
  const endTime = Date.now();
  const totalDuration = endTime - startTime;
  console.log(`Загальна тривалість відправки 3 повідомлень в один чат: ${totalDuration} мс`);
  
  // Перше повідомлення надсилається одразу. Друге — через 1000мс. Третє — через 2000мс.
  // Загальний час виконання Promise.all має бути приблизно 2000 мс або більше.
  assert(totalDuration >= 1950, `Затримка для одинакових чатів має бути не менше 2000 мс (зафіксовано: ${totalDuration} мс)`);

  // Перевірка інтервалів між повідомленнями в capturedMessages
  const diff1 = capturedMessages[1].timestamp - capturedMessages[0].timestamp;
  const diff2 = capturedMessages[2].timestamp - capturedMessages[1].timestamp;
  console.log(`Інтервал між 1 та 2 повідомленням: ${diff1} мс`);
  console.log(`Інтервал між 2 та 3 повідомленням: ${diff2} мс`);
  assert(diff1 >= 950, `Інтервал 1-2 має бути >= 1000 мс (зафіксовано: ${diff1} мс)`);
  assert(diff2 >= 950, `Інтервал 2-3 має бути >= 1000 мс (зафіксовано: ${diff2} мс)`);

  // -------------------------------------------------------------
  // Тест 5: Обробка помилок API Telegram (ізоляція помилок)
  // -------------------------------------------------------------
  console.log('\n--- Тест 5: Обробка помилок Telegram API ---');
  
  // Симулюємо помилку 403 Forbidden (бот заблоковано користувачем)
  mockFetchStatus = 403;
  mockFetchResponse = { ok: false, error_code: 403, description: 'Forbidden: bot was blocked by the user' };

  console.log('Тестуємо відправку при помилці 403 (не повинно викидати виключення)...');
  let threwException = false;
  try {
    await sendUserAlert('222222', 'welcome');
  } catch {
    threwException = true;
  }
  assert(!threwException, 'Функція не повинна викидати виключення при помилці 403');

  // Симулюємо помилку 429 Too Many Requests
  mockFetchStatus = 429;
  mockFetchResponse = { ok: false, error_code: 429, description: 'Too Many Requests: retry after 5' };
  
  console.log('Тестуємо відправку при помилці 429 (не повинно викидати виключення)...');
  threwException = false;
  try {
    await sendAdminAlert({
      event: 'Платіж отримано',
      email: 'test@test.com',
      website: 'test.com',
    });
  } catch {
    threwException = true;
  }
  assert(!threwException, 'Функція не повинна викидати виключення при помилці 429');

  // -------------------------------------------------------------
  // Тест 6: Поведінка при відсутності конфігурації
  // -------------------------------------------------------------
  console.log('\n--- Тест 6: Поведінка при відсутності токена/чатів ---');
  
  // Видаляємо токен
  const originalToken = process.env.TELEGRAM_BOT_TOKEN;
  delete process.env.TELEGRAM_BOT_TOKEN;
  capturedMessages.length = 0;

  console.log('Відправляємо сповіщення без токена (має записати warn та вийти)...');
  await sendAdminAlert({
    event: 'Нова підписка',
    email: 'test@test.com',
    website: 'test.com',
  });
  assert(capturedMessages.length === 0, 'Повідомлення не повинно відправлятись без токена');

  // Відновлюємо токен
  process.env.TELEGRAM_BOT_TOKEN = originalToken;

  console.log('\n=== РЕЗУЛЬТАТ ТЕСТУВАННЯ ===');
  if (failed) {
    console.error('❌ Деякі тести провалено.');
    process.exit(1);
  } else {
    console.log('🎉 УСІ ТЕСТИ УСПІШНО ПРОЙДЕНО!');
    process.exit(0);
  }
}

runTests().catch(err => {
  console.error('Непередбачена помилка під час виконання тестів:', err);
  process.exit(1);
});
