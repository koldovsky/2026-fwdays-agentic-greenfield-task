import {
  FeedItemDto,
  TicketCategory,
  TicketEventField,
  TicketPriority,
  TicketStatus,
} from './ticket.model';

// Single source of Ukrainian labels for the ticket enums (design D4):
// categories PRD §5.2, priorities §5.3, statuses §5.1. Card and form both
// consume these maps — nothing else translates enum keys.
export const CATEGORY_LABELS: Record<TicketCategory, string> = {
  PLUMBING: 'Сантехніка',
  HEATING: 'Опалення / теплопостачання',
  ELECTRICITY: 'Електропостачання',
  ELEVATOR: 'Ліфт',
  ROOF_FACADE: 'Покрівля та фасад',
  COMMON_AREAS: 'Під’їзд і МЗК',
  GROUNDS: 'Прибудинкова територія / благоустрій',
  ACCESS_SYSTEMS: 'Домофон / шлагбаум / відеоспостереження',
  OTHER: 'Інше',
};

export const PRIORITY_LABELS: Record<TicketPriority, string> = {
  EMERGENCY: 'Аварійна',
  HIGH: 'Висока',
  NORMAL: 'Звичайна',
};

export const STATUS_LABELS: Record<TicketStatus, string> = {
  NEW: 'Нова',
  IN_PROGRESS: 'В роботі',
  DONE: 'Виконана',
  CLOSED: 'Закрита',
  REJECTED: 'Відхилена',
};

interface EnumOption<T extends string> {
  value: T;
  label: string;
}

function toOptions<T extends string>(
  labels: Record<T, string>,
): EnumOption<T>[] {
  return (Object.keys(labels) as T[]).map((value) => ({
    value,
    label: labels[value],
  }));
}

export const CATEGORY_OPTIONS = toOptions(CATEGORY_LABELS);
export const PRIORITY_OPTIONS = toOptions(PRIORITY_LABELS);
export const STATUS_OPTIONS = toOptions(STATUS_LABELS);

// Transition button labels = the action names from the PRD §5.1 table,
// keyed from → to: the same target reads differently depending on the
// source (DONE → IN_PROGRESS is «повторне відкриття», not «взято в роботу»).
const TRANSITION_ACTION_LABELS: Partial<
  Record<TicketStatus, Partial<Record<TicketStatus, string>>>
> = {
  NEW: { IN_PROGRESS: 'Взято в роботу', REJECTED: 'Не виконуємо' },
  IN_PROGRESS: { DONE: 'Роботу завершено', REJECTED: 'Не виконуємо' },
  DONE: { IN_PROGRESS: 'Повторне відкриття', CLOSED: 'Підтверджено й закрито' },
};

// Falls back to the target status name — a §5.1-table move always has an
// action label, so the fallback only guards against contract drift.
export function transitionActionLabel(
  from: TicketStatus,
  to: TicketStatus,
): string {
  return TRANSITION_ACTION_LABELS[from]?.[to] ?? STATUS_LABELS[to];
}

// System-event rendering (FR-FEED-02): the wire carries locale-free
// field/oldValue/newValue snapshots; the Ukrainian sentence is composed
// here and nowhere else.
const EVENT_FIELD_LABELS: Record<
  Exclude<TicketEventField, 'ATTACHMENT'>,
  string
> = {
  STATUS: 'Статус',
  HOUSE: 'Будинок',
  CATEGORY: 'Категорія',
  PRIORITY: 'Пріоритет',
  EXECUTOR: 'Виконавець',
  DUE_DATE: 'Цільовий термін',
};

const EMPTY_VALUE = '—';

// Enum-carrying fields translate through their label tables; HOUSE and
// EXECUTOR carry plain-text snapshots and pass through as-is.
const EVENT_VALUE_TABLES: Partial<
  Record<TicketEventField, Record<string, string>>
> = {
  STATUS: STATUS_LABELS,
  CATEGORY: CATEGORY_LABELS,
  PRIORITY: PRIORITY_LABELS,
};

// YYYY-MM-DD → dd.MM.yyyy, no Date round-trip (design D5 discipline)
function formatWireDate(value: string): string {
  const [y, m, d] = value.split('-');
  return d && m && y ? `${d}.${m}.${y}` : value;
}

function eventValueLabel(
  field: TicketEventField,
  value: string | null,
): string {
  if (value === null || value === '') return EMPTY_VALUE;
  if (field === 'DUE_DATE') return formatWireDate(value);
  return EVENT_VALUE_TABLES[field]?.[value] ?? value;
}

/** «Статус: Нова → В роботі», «Виконавець: — → Майстер Петро»,
 *  «Додано фото «кухня.jpg»» / «Видалено фото «кухня.jpg»» (S-07). */
export function eventText(item: FeedItemDto): string {
  if (!item.field) return '';
  if (item.field === 'ATTACHMENT') {
    return item.newValue !== null
      ? `Додано фото «${item.newValue}»`
      : `Видалено фото «${item.oldValue ?? ''}»`;
  }
  const label = EVENT_FIELD_LABELS[item.field];
  const oldValue = eventValueLabel(item.field, item.oldValue);
  const newValue = eventValueLabel(item.field, item.newValue);
  return `${label}: ${oldValue} → ${newValue}`;
}
