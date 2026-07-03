## 1. Database Schema Additions

- [ ] 1.1 Create the pending registrations schema file `db/schema/pending_registrations.ts` with fields for `id`, `token`, `telegramId`, `telegramUsername`, `email`, `websiteUrl`, `isCompleted`, `expiresAt`, and `createdAt`
- [ ] 1.2 Create the OTP codes schema file `db/schema/otp_codes.ts` with fields for `id`, `userId`, `code`, `expiresAt`, `isUsed`, and `createdAt`
- [ ] 1.3 Export the new schemas in `db/schema/index.ts`
- [ ] 1.4 Generate the database migration files using `npx drizzle-kit generate`

## 2. API Routes and Route Handlers

- [ ] 2.1 Create the Telegram Webhook handler at `app/api/telegram/webhook/route.ts` to process incoming messages from Telegram Bot API with token verification using `X-Telegram-Bot-Api-Secret-Token`
- [ ] 2.2 Create registration token endpoint at `app/api/auth/register-token/route.ts` that generates a new temporary UUIDv4 token and inserts it into `pending_registrations`
- [ ] 2.3 Create registration polling handler at `app/api/auth/poll-registration/route.ts` to check if a pending registration is complete and set the session cookie
- [ ] 2.4 Create Magic Link validation route at `app/api/auth/magic/route.ts` to verify the magic token, establish a session, and redirect the user
- [ ] 2.5 Create login/OTP route at `app/api/auth/otp/route.ts` to handle sending OTP to the bot and verifying OTP submitted by the user on the login page

## 3. Telegram Bot Dialog Logic

- [ ] 3.1 Implement Telegram Bot conversation management in `lib/telegram-bot.ts` using state tracking in the database
- [ ] 3.2 Implement bot response to `/start reg_<token>` by validating the token and prompting the user for their email in Ukrainian: "Будь ласка, введіть вашу електронну адресу (email)"
- [ ] 3.3 Implement bot validation of email input, transition to website URL prompt: "Будь ласка, введіть адресу вашого сайту (website URL)"
- [ ] 3.4 Implement website URL validation, insert user record, generate secure API key, store its SHA-256 hash in `apiKeyHash`, mark the registration token as completed, and send the final confirmation with a magic link
- [ ] 3.5 Implement OTP code dispatch message: "Ваш одноразовий код для входу: <6-digit_code>"
- [ ] 3.6 Ensure all bot messages and errors are written in Ukrainian, using a calm tone with no exclamation marks

## 4. Frontend UI Pages

- [ ] 4.1 Build the registration page `app/register/page.tsx` displaying the QR code and link to the Telegram bot, including polling/redirection logic
- [ ] 4.2 Build the login page `app/login/page.tsx` with email input to request OTP, and code input to verify OTP
- [ ] 4.3 Ensure styling matches the Precision Hub theme (Space Grotesk + Inter font stack, strict borders, light mode palette)
- [ ] 4.4 Ensure all text copy is in Ukrainian with no exclamation marks

## 5. Verification and Integration

- [ ] 5.1 Create mock webhook script to test Telegram bot conversation steps
- [ ] 5.2 Verify end-to-end registration flow (QR code -> Bot conversation -> Database insertion -> Client-side redirect)
- [ ] 5.3 Verify login flows (Magic Link validation and OTP authentication)
- [ ] 5.4 Run typescript compilation (`tsc --noEmit`) and linting (`npm run lint`) to confirm codebase health
