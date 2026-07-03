## 1. Автентифікація за API-ключем

- [ ] 1.1 Створити допоміжну функцію `authenticateApiKey(request)` у `lib/auth.ts`, яка витягує заголовок `X-API-Key`, хешує його через SHA-256 та шукає користувача за `api_key_hash` у таблиці `users`. Повертає об'єкт користувача або `null`.

## 2. Перевірка підписки

- [ ] 2.1 Створити допоміжну функцію `checkActiveSubscription(userId)` у `lib/auth.ts`, яка виконує `SELECT status, currentPeriodEnd FROM subscriptions WHERE userId = ? ORDER BY createdAt DESC LIMIT 1` та повертає об'єкт `{ allowed: boolean, statusCode: number, error: string }` з відповідним HTTP-кодом (402/403) залежно від статусу підписки.

## 3. Валідація конверсій

- [ ] 3.1 Створити модуль `lib/conversions.ts` з функцією `validateConversions(data: unknown)`, яка перевіряє: тіло запиту є масивом від 1 до 500 елементів; кожний елемент містить обов'язкові поля (`date` — YYYY-MM-DD, `conversionTime` — ISO 8601, `conversionName` — непорожній рядок, `isAdConversion` — boolean); необов'язкові поля (`email`, `phone`, `conversionValue`, `orderId`, `ipAddress`, `adSource`, `channel`) мають правильний тип. Повертає масив валідованих записів або масив помилок з індексами.

## 4. API Route Handler

- [ ] 4.1 Створити `app/api/conversions/route.ts` з обробником `POST`, який послідовно: (1) парсить JSON-тіло; (2) автентифікує за `X-API-Key`; (3) перевіряє підписку; (4) валідує масив конверсій; (5) виконує batch `db.insert(conversions).values(records)`; (6) повертає `{ status: "ok", inserted: N }`.
- [ ] 4.2 Додати обробку помилок: `400` для невалідного JSON/даних, `401` для відсутнього/невалідного ключа, `402/403` для неактивної підписки, `500` для непередбачених помилок (без розкриття деталей).

## 5. Очищення застарілих конверсій

- [ ] 5.1 Створити `app/api/conversions/cleanup/route.ts` з обробником `GET`, який: (1) перевіряє `Authorization: Bearer <CRON_SECRET>` з `process.env.CRON_SECRET`; (2) видаляє записи з `conversions`, де `conversionTime` старший за 14 місяців; (3) повертає `{ deleted: N }`.
- [ ] 5.2 Додати конфігурацію Vercel Cron у `vercel.json`: `{ "crons": [{ "path": "/api/conversions/cleanup", "schedule": "0 3 * * *" }] }`.
- [ ] 5.3 Додати `CRON_SECRET` до `.env.example`.

## 6. Верифікація

- [ ] 6.1 Перевірити компіляцію TypeScript (`tsc --noEmit`) та лінтинг (`npm run lint`) без помилок.
- [ ] 6.2 Перевірити збірку проекту (`npm run build`) без помилок.
