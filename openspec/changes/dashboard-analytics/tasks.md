## 1. Setup and Dependencies

- [x] 1.1 Install `recharts` library as a dependency in `package.json` and run `npm install`.
- [x] 1.2 Verify that custom CSS variables and utility classes are loaded correctly on `/dashboard`.

## 2. API Key and Apps Script Generator

- [x] 2.1 Create Next.js Route Handler or Server Action for API key generation. It must generate a cryptographically secure key (length >= 32), compute its SHA-256 hash, and update `users.apiKeyHash`.
- [x] 2.2 Create API endpoint or utility to dynamically generate the Google Apps Script code snippet, substituting the current host URL and user's API Key.
- [x] 2.3 Implement client-side UI widget for generating and showing the API key (strictly once on generation) with copy-to-clipboard functionality.

## 3. CRM & Telephony Integration Settings

- [x] 3.1 Create Next.js API route or Server Action to save CRM/Telephony access credentials. Validate URLs (HTTPS required), encrypt passwords/API keys using `encrypt` from `lib/crypto.ts`, and return structured validation errors (`400`) or generic server errors (`500`).
- [x] 3.2 Create Next.js API route or Server Action to load CRM/Telephony credentials, masking the passwords/API keys (sending flags such as `hasCrmPassword: true`).
- [x] 3.3 Create client-side UI form for CRM and Telephony credentials with field masking (`••••••••`), edit detection (preventing submitting unchanged masked fields), input validation, clear/delete action support, and saving states.

## 4. Analytics Data Fetching & Aggregation

- [x] 4.1 Create Next.js API route `/api/analytics` or Server Action that accepts a date range filter (up to 14 months) and verifies user session.
- [x] 4.2 Implement optimized database query using Drizzle ORM to fetch all conversions for the selected user and period.
- [x] 4.3 Write logic to aggregate metrics (total conversions, total value in UAH, ad conversions count, ad conversions %) in a single pass.
- [x] 4.4 Implement group-by aggregation for the Line Chart (grouped by date) and Pie Charts (grouped by `adSource` and `channel`).

## 5. Dashboard UI Layout and Charts

- [x] 5.1 Update `app/dashboard/page.tsx` to integrate client-side tabs (Аналітика, Інтеграція, Інструкції, Оплата).
- [x] 5.2 Build metric summary cards with clean grid positioning and skeleton loaders for the fetching state.
- [x] 5.3 Implement dynamic Recharts Line Chart component for conversion trends, bypassing SSR using next/dynamic with `{ ssr: false }`.
- [x] 5.4 Implement Recharts Pie Charts for ad sources and channels distribution.

## 6. Conversions Log Table

- [x] 6.1 Create database query to retrieve the last 100 conversions within the selected date range (Kyiv timezone boundaries), sorted by conversion time descending, supporting optional `ad_source` and `channel` filters on the server.
- [x] 6.2 Build a paginated table (10 rows per page) integrated with server-side filters for source (`ad_source`) and channel (`channel`).

## 7. Instructions Guides Accordion

- [x] 7.1 Build an Accordion component displaying structured integration instructions for GA4, Google Ads, Google Cloud, and Binotel.
- [x] 7.2 Explicitly include the Google Cloud service account `auto@acontrol.pro` and details for setting roles (Editor, Project IAM Admin, BigQuery Admin) in the GCP instructions guide.

## 8. Verification and Quality Assurance

- [x] 8.1 Execute TypeScript typechecks using `npx tsc --noEmit` and verify there are no compilation errors.
- [x] 8.2 Run `npm run lint` and fix any style or syntax warnings, ensuring compliance with Ukrainian language (`NFR-I18N-01`) and calm brand tone (`BC-BRAND-01`).
- [x] 8.3 Validate dashboard loading speed to ensure NFR-PERF-02 target (<= 500ms) is met.

## 9. Subscription Management (Billing Tab)

- [x] 9.1 Create Next.js API route or Server Action to load the current subscription details and masked card info from `subscriptions` table.
- [x] 9.2 Implement Checkout flow redirecting the user to the Monobank invoice payment page (using `POST /api/merchant/invoice/create` with card tokenization).
- [x] 9.3 Implement the recurring payment Pause functionality flow (triggering `/api/billing/pause` or Server Action).
- [x] 9.4 Implement the Cancel subscription flow with a warning modal (triggering `/api/billing/cancel` and card token deletion).
- [x] 9.5 Build the frontend UI Billing tab showing subscription details, checkout choices, Pause/Resume button, and Cancel button with the confirmation modal.
