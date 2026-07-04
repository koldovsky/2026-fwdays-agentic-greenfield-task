# Автор

Чайка Євген

# Відео

https://drive.google.com/file/d/1-zNcq4I96PLDrYWElz4S1Z5snGdOhVHe/view?usp=sharing

# Проект 

MotoRoute — MVP вебзастосунок для планування багатоденних мото-подорожей. Ви вказуєте місто старту та фінішу, відстань між зупинками відпочинку і максимальний пробіг за день — застосунок будує маршрут із щоденними етапами, зупинками та ночівлею на інтерактивній карті.


Перед початком роботи я згенерував специфікаю по проекту зрозумілу для агента і читабельну для людини. Інтегрував мінімальну згенеровану дизайн систему. Попередні етапи були виконанні для максимально зрозумілої генерації ШІ агентом, щоб він не вгадував, а логічно викноував поставлені задачі. Надалі в проект був доданий OpenSpec та розробка була поділена на етапи (capabilities). Для імплементації капабілітіс я виконував роботу циклами вручну propose → apply → review && verify → archive. На етапі review && verify я створював нового агента для того щоб він перевірив задачу об'єктивно.

## Перевірка та review

Повна таблиця верифікації (тести, lint, build, метрики, ручні чеклисти, traceability по `FR-*` / `NFR-*`): **[docs/test-plan.md](docs/test-plan.md)**.

| Перевірка | Команда | Результат |
| --------- | ------- | --------- |
| ESLint | `npm run lint` | Pass |
| TypeScript | `npm run typecheck` | Pass |
| Unit tests | `npm test` | 15 файлів, 39 тестів |
| Production build | `npm run build` | Pass |
| Повний gate | `npm run check` | ~11 s (&lt; 60 s) |
| CI | `.github/workflows/quality.yml` | `npm run check` на PR |
| Lighthouse (desktop / mobile) | prod `/` | 100 / 95 (≥ 90) |
| Segmentation perf | Vitest | &lt; 50 ms |
| Console audit | manual | Pass |
