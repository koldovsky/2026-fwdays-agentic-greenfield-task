Furniture Configurator & Catalog demo — Next.js (App Router) + TypeScript, Prisma ORM + SQLite, Vitest.

## Getting Started

Install dependencies, then apply the Prisma schema and seed the database:

```bash
npm install
npx prisma migrate dev
npx prisma db seed
```

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser — you'll be redirected to `/login`.

You can start editing the app by modifying files under `src/app`. The page auto-updates as you edit.

### Demo roles

The login page shows the available demo accounts:

- `manager` / `manager123` — configurator (`/manager`), builds and prices a nightstand from catalog attributes.
- `admin` / `admin123` — catalog administration (`/admin`), manages dictionaries, standard sizes, part specs, and catalog entries.

Log in with either account to check role-based access; each role redirects to its own section after authentication.

### Tests

```bash
npm test
```

Runs the Vitest suite, including the pure domain-logic tests under `src/lib/configurator/*`.

### Production build

```bash
npm run build
npm run start
```

## Prisma

- `npx prisma migrate dev` — apply schema changes to the local SQLite DB.
- `npx prisma db seed` — seed dictionaries, the nightstand product type, and catalog data.
- `npx prisma studio` — inspect the SQLite DB.

