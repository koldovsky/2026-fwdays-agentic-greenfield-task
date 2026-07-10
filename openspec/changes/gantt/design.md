# Design: gantt

## Розподіл: чиста логіка ↔ імперативний dhtmlx

```
lib/gantt/
  types.ts        ← GanttTask, GanttData, TaskKind
  status.ts       ← taskCssClass(status, locked): клас кольору (FR-GANTT-03)
  to-gantt.ts     ← buildGanttData(...): операції → дерево ГРЦ→РЦ→операція (FR-GANTT-01/02)
lib/scheduler/
  reschedule.ts   ← applyManualMove(...): перерахунок залежних при drag (FR-GANTT-07)

src/
  store/session-store.ts  ← plan, runPlanning, moveOperation, lockedOpIds
  components/
    GanttChart.tsx  ← імперативна обгортка dhtmlx-gantt (init, scale, marker, drag, filter)
    GanttView.tsx   ← панель: тулбар масштабу/фільтрів, кнопка критичного шляху, бокова панель
```

## Модель даних Гантта (FR-GANTT-01)

dhtmlx рендерить дерево задач у сітці зліва + смуги справа. Вісь Y = РЦ,
згруповані по ГРЦ, моделюється трирівневим деревом:

```
ГРЦ (type: project)               ← рядок групи
  └─ РЦ (type: project)           ← рядок ресурсного центру
       └─ операція (type: task)   ← смуга з датами
```

`buildGanttData({ operations, rcGroups, resourceCenters, lockedOpIds })`
повертає плоский `GanttTask[]`:
- по одному вузлу `group` на кожну ГРЦ (що має РЦ у розкладі),
- по одному вузлу `rc` на кожен РЦ (parent = ГРЦ),
- по одному вузлу `op` на кожну операцію (parent = РЦ), з полями
  `start_date`/`end_date` (рядок `YYYY-MM-DD HH:mm`), `text`, `orderId`,
  `nomenclatureId`, `opNo`, `status`, `locked`, `css`.

Стабільний `id` операції = `` `${bomNodeId}#${opNo}` `` (узгоджено з
`operationId` / `OrderResult.criticalPath`).

## Кольори (FR-GANTT-03)

`taskCssClass(status, locked)`:

| Статус | Клас | Колір |
|---|---|---|
| `ok` | `gop gop--ok` | синій |
| `at-risk` | `gop gop--risk` | жовтий |
| `late` | `gop gop--late` | червоний |
| `blocked-material` | `gop gop--blocked` | сірий |
| + `locked` | `… gop--locked` | штрихування |

Класи застосовуються через `gantt.templates.task_class`.

## Текст смуги (FR-GANTT-02)

`gantt.templates.task_text = op → `${opName} · ${orderId} · ${nomenclatureId}``.

## Масштаб (FR-GANTT-05)

Пресети `hour | day | week | month` → `gantt.config.scales` + `gantt.render()`
без перезавантаження.

## Лінія «Сьогодні» (FR-GANTT-09)

Плагін `marker`: `gantt.addMarker({ start_date: today, css: 'gantt-today' })`;
маркер додається при кожному render, тому завжди видимий.

## Фільтри (FR-GANTT-06)

`gantt.attachEvent('onBeforeTaskDisplay', (id, task) => predicate(task, filters))`.
Фільтри: ГРЦ, РЦ, замовлення, номенклатура, статус, лише критичний шлях.
Рядки-групи/РЦ показуються, якщо мають хоч одну видиму операцію.

## Бокова панель (FR-GANTT-04)

`gantt.attachEvent('onTaskClick', …)` → React-стан `selectedOpId` → панель із
деталями операції: РЦ/ГРЦ, замовлення, місце в BOM (bomNodeId), тривалість,
статус, матеріал-блокер, попередні/наступні операції.

## Критичний шлях (FR-GANTT-08)

Кнопка перемикає підсвітку: множина `criticalPath` обраного замовлення
(`OrderResult.criticalPath`) → додатковий клас `gop--critical` у `task_class`.

## Drag-and-drop і перерахунок (FR-GANTT-07)

`gantt.attachEvent('onAfterTaskDrag', (id) => …)`:
1. зчитати новий `start_date` смуги,
2. викликати `applyManualMove(operations, opId, newStart, orders, calendar)` —
   чисту функцію, що:
   - фіксує (locks) переміщену операцію,
   - розповсюджує обмеження Finish-to-Start + міжопераційний день на **залежні**
     операції (наступні в маршруті та операції батьківських вузлів BOM), зсуваючи
     їх уперед за потреби (RC-призначення не змінюються — MVP),
   - перераховує `plannedReadyDate` / `delayDays` / `criticalPath` замовлень,
3. оновити store (`plan.operations`, `plan.orders`, `lockedOpIds`),
4. перерендерити Гантт і показати нову дату замовлення.

### applyManualMove — контракт

```typescript
function applyManualMove(
  operations: ScheduledOperation[],
  movedOpId: string,          // `${bomNodeId}#${opNo}`
  newStart: Date,
  orders: Order[],
  calendar: WorkCalendar[],
): { operations: ScheduledOperation[]; orders: OrderResult[] }
```

Залежності відновлюються зі структури (як у `critical-path`): у межах вузла
операція залежить від попередньої за `opNo`; перша операція вузла — від останніх
операцій дочірніх вузлів BOM. Розповсюдження лише вперед: кожна залежна операція
`start = max(поточний start, nextWorkingDayStart(max end предків))`.

## Обмеження MVP

| Обмеження | Рішення |
|---|---|
| Drag не переприсвоює РЦ | Операція лишається на своєму РЦ; можливе перекриття не розвʼязується |
| Перекриття на РЦ після зсуву | Позначається кольором/попередженням, без авто-розвʼязання |
| Критичний шлях спільних вузлів | Використовується `OrderResult.criticalPath`; для вузла, спільного між замовленнями, підсвічується у первинного замовлення |
