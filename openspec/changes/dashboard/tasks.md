# Tasks: dashboard

Агрегація 4 блоків — чиста функція у `lib/overview/`; картки і навігація — у `src/`.

---

## Milestone 1 — Чиста агрегація (lib/overview/)

- [x] **1.1** `types.ts`: `Overview`, `BuildOverviewOptions`
- [x] **1.2** `build.ts`: `buildOverview(...)` — статуси, топ-5 запізнень,
      критичні дефіцити, перевантажені слоти (FR-DASH-01)
- [x] **1.3** `index.ts` — публічний API
- [x] **1.4** Unit-тести Сценаріїв A, B, C

## Milestone 2 — Компонент (src/components)

- [x] **2.1** `OverviewDashboard.tsx`: 4 KPI-картки з числами
- [x] **2.2** Deep-link кожної картки до детального розділу (FR-DASH-02)
- [x] **2.3** Секції-якорі у `App.tsx` + інтеграція дашборду зверху

## Milestone 3 — Перевірка

- [x] **3.1** `tsc --noEmit` (lib) і `tsc -b` (app) — без помилок
- [x] **3.2** `vitest run` — усі тести зелені
- [x] **3.3** `oxlint` чисто; `vite build` успішно
- [x] **3.4** `openspec validate --all --strict`
