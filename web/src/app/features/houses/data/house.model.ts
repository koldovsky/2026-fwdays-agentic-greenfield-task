export interface HouseDto {
  id: number;
  name: string;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface HouseInput {
  name: string;
  note: string | null;
}

// Field limits mirror the API validation (houses.service.ts)
export const HOUSE_NAME_MAX = 255;
export const HOUSE_NOTE_MAX = 1000;

// Mirror of the API error contract (api: house-errors.ts).
// The API is locale-free; Ukrainian copy lives here.
type HouseErrorCode =
  | 'HOUSE_NAME_INVALID'
  | 'HOUSE_NOTE_INVALID'
  | 'HOUSE_NOT_FOUND'
  | 'HOUSE_HAS_TICKETS';

const MESSAGES: Record<HouseErrorCode, string> = {
  HOUSE_NAME_INVALID: 'Вкажіть назву або адресу будинку',
  HOUSE_NOTE_INVALID: 'Примітка задовга — до 1000 символів',
  HOUSE_NOT_FOUND: 'Будинок не знайдено',
  HOUSE_HAS_TICKETS: 'Неможливо видалити: до будинку прив’язані заявки',
};

const FALLBACK_MESSAGE = 'Щось пішло не так. Спробуйте ще раз';

export function houseErrorMessage(error: unknown): string {
  const code = (error as { error?: { code?: string } })?.error?.code;
  return MESSAGES[code as HouseErrorCode] ?? FALLBACK_MESSAGE;
}
