## 1. Автентифікація за API-ключем

- [x] 1.1 Створити допоміжну функцію `authenticateApiKey(request)` у `lib/auth.ts`, яка витягує заголовок `X-API-Key`, хешує його через SHA-256 та шукає користувача за `api_key_hash` у таблиці `users`. Повертає об'єкт користувача або `null`.

## 2. Перевірка підписки

- [x] 2.1 Створити допоміжну функцію `checkActiveSubscription(userId)` у `lib/auth.ts`, яка виконує `SELECT status, currentPeriodEnd FROM subscriptions WHERE userId = ? ORDER BY createdAt DESC LIMIT 1` та повертає об'єкт `{ allowed: boolean, statusCode: number, error: string }` з відповідним HTTP-кодом (402/403) залежно від статусу підписки.

## 3. Валідація конверсій

- [x] 3.1 Створити модуль `lib/conversions.ts` з функцією `validateConversions(data: unknown)`, яка перевіряє: тіло запиту є масивом від 1 до 500 елементів; кожний елемент містить обов'язкові поля (`date` — YYYY-MM-DD, `conversionTime` — ISO 8601, `conversionName` — непорожній рядок, `isAdConversion` — boolean); необов'язкові поля (`email`, `phone`, `conversionValue`, `orderId`, `ipAddress`, `adSource`, `channel`) мають правильний тип. Повертає масив валідованих записів або масив помилок з індексами.

## 4. API Route Handler

- [x] 4.1 Створити `app/api/conversions/route.ts` з обробником `POST`, який послідовно: (1) парсить JSON-тіло; (2) автентифікує за `X-API-Key`; (3) перевіряє підписку; (4) валідує масив конверсій; (5) виконує batch `db.insert(conversions).values(records)`; (6) повертає `{ status: "ok", inserted: N }`.
- [x] 4.2 Додати обробку помилок: `400` для невалідного JSON/даних, `401` для відсутнього/невалідного ключа, `402/403` для неактивної підписки, `500` для непередбачених помилок (без розкриття деталей).

## 5. Очищення застарілих конверсій

- [x] 5.1 Створити `app/api/conversions/cleanup/route.ts` з обробником `GET`, який: (1) перевіряє наявність `process.env.CRON_SECRET` (якщо відсутня — повертає `500` з логом помилки конфігурації); (2) перевіряє `Authorization: Bearer <CRON_SECRET>` (якщо відсутній або невалідний — повертає `401`); (3) видаляє записи з `conversions`, де `conversionTime < NOW() - INTERVAL '14 months'`, пакетами по `LIMIT 10000` до завершення; (4) повертає `{ deleted: N }`.
- [x] 5.2 Додати конфігурацію Vercel Cron у `vercel.json`: `{ "crons": [{ "path": "/api/conversions/cleanup", "schedule": "0 3 * * *" }] }`.
- [x] 5.3 Додати `CRON_SECRET` до `.env.example`.

## 6. Верифікація

- [x] 6.1 Перевірити компіляцію TypeScript (`tsc --noEmit`) та лінтинг (`npm run lint`) без помилок.
- [x] 6.2 Перевірити збірку проекту (`npm run build`) без помилок.

## 7. Ручне приймальне тестування (Definition of Done)

- [x] 7.1 `POST /api/conversions` з валідним `X-API-Key` та масивом з 1 запису → відповідь `200 { "status": "ok", "inserted": 1 }`.
- [x] 7.2 `POST /api/conversions` без заголовка `X-API-Key` → відповідь `401 { "error": "Missing X-API-Key header" }`.
- [x] 7.3 `POST /api/conversions` з невалідним `X-API-Key` → відповідь `401 { "error": "Invalid API key" }`.
- [x] 7.4 `POST /api/conversions` з валідним ключем, але неактивною підпискою (`paused`) → відповідь `402 { "error": "Subscription is paused. Please resume your subscription." }`.
- [x] 7.5 `POST /api/conversions` з масивом > 500 записів → відповідь `400 { "error": "conversions array must contain at least 1 and at most 500 items" }`.
- [x] 7.6 `POST /api/conversions` з невалідним записом (відсутнє `conversionName`) → відповідь `400 { "error": "Validation failed", "details": [...] }`, жоден запис не збережено.
- [x] 7.7 `GET /api/conversions/cleanup` без заголовка `Authorization` → відповідь `401 Unauthorized`.
- [x] 7.8 `GET /api/conversions/cleanup` з коректним `Authorization: Bearer <CRON_SECRET>` → відповідь `200 { "deleted": N }`.
