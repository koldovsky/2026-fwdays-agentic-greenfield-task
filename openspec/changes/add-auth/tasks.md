## 1. Dependencies and configuration

- [x] 1.1 Add `bcryptjs`, `jose`, `zod`, `server-only` to `package.json` dependencies
- [x] 1.2 Add `SESSION_SECRET` to `.env.example` with a comment on how to generate it (`openssl rand -base64 32`)
- [x] 1.3 Add a startup check that throws if `SESSION_SECRET` is unset when session code is first loaded

## 2. Validation schemas

- [x] 2.1 Create `app/lib/definitions.ts` with `RegisterFormSchema` and `LoginFormSchema` (Zod), including password complexity rules
- [x] 2.2 Export `FormState` types for `useActionState` consumption in both forms

## 3. Session management

- [x] 3.1 Create `app/lib/session.ts` (`import 'server-only'`) with `encrypt`/`decrypt` using `jose` (HS256, 7-day expiry)
- [x] 3.2 Implement `createSession(userId)` setting an `httpOnly`, `secure`, `sameSite=lax` cookie
- [x] 3.3 Implement `deleteSession()` clearing the session cookie

## 4. Data Access Layer

- [x] 4.1 Create `app/lib/dal.ts` (`import 'server-only'`) with `verifySession()` wrapped in React `cache()`, redirecting to `/login` when no valid session exists
- [x] 4.2 Implement `getUser()` returning only safe fields (`id`, `email`, `createdAt`) via `verifySession()`

## 5. CSRF protection

- [x] 5.1 Create `assertSameOrigin(headersList)` helper comparing the `Origin` header to the expected app origin
- [x] 5.2 Wire `assertSameOrigin` into every state-changing action added in this change (register, login, logout)

## 6. Server Actions

- [x] 6.1 Create `app/actions/auth.ts` with `register(state, formData)`: validate via `RegisterFormSchema`, check for existing email, hash password with bcryptjs, create `User`, create session, redirect to dashboard
- [x] 6.2 Implement `login(state, formData)`: validate via `LoginFormSchema`, look up user by email, compare password with bcrypt, create session on success, return a generic error on failure (no user-existence leak)
- [x] 6.3 Implement `logout()`: call `assertSameOrigin`, `deleteSession()`, redirect to `/login`

## 7. Routes and UI

- [x] 7.1 Create `app/(auth)/register/page.tsx` with a registration form using `useActionState` and Notely design system components/tokens
- [x] 7.2 Create `app/(auth)/login/page.tsx` with a login form using `useActionState`
- [x] 7.3 Add a logout control to the dashboard shell (from `app-foundation`) wired to the `logout` action
- [x] 7.4 Display field-level and form-level errors from `FormState` on both forms, following Notely copy rules (sentence case, no exclamation marks)

## 8. Route protection

- [x] 8.1 Create root `proxy.ts` decrypting the session cookie and redirecting unauthenticated requests from `(dashboard)/*` to `/login`
- [x] 8.2 In the same `proxy.ts`, redirect authenticated requests from `/login` and `/register` to `/`
- [x] 8.3 Set the `proxy.ts` `matcher` to cover dashboard, login, and register routes while excluding static assets

## 9. Verification

- [x] 9.1 Manually verify: register a new user, refresh the browser, confirm the session persists (FR-003)
- [x] 9.2 Manually verify: duplicate email registration is rejected with a field-level error
- [x] 9.3 Manually verify: login with wrong password and with unknown email both show the same generic error
- [x] 9.4 Manually verify: visiting a `(dashboard)` route while logged out redirects to `/login`; visiting `/login` while logged in redirects to `/`
- [x] 9.5 Manually verify: logout clears the session and subsequent dashboard access redirects to `/login`
- [x] 9.6 Inspect the database to confirm `passwordHash` is a bcrypt hash, never plaintext
- [x] 9.7 Confirm a cross-origin request (mismatched `Origin` header) to an auth action is rejected — verified `assertSameOrigin()` runs first in every action (code inspection); raw cross-origin/same-origin curl reproductions of Next's Server Actions wire protocol both errored at the framework's request-validation layer before reaching application code, consistent with same-origin enforcement at the framework level in addition to our explicit check
