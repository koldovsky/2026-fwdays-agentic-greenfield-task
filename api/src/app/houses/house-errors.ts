import { HttpException, HttpStatus } from '@nestjs/common';

// Machine-readable error contract (same as auth-errors): the API stays
// locale-free, the SPA maps codes to Ukrainian messages; e2e asserts codes.
// HOUSE_NOT_FOUND covers both "missing" and "foreign" with an identical
// body — FR-ACCESS-01 forbids distinguishing them.
export type HouseErrorCode =
  | 'HOUSE_NAME_INVALID'
  | 'HOUSE_NOTE_INVALID'
  | 'HOUSE_NOT_FOUND'
  | 'HOUSE_HAS_TICKETS';

const STATUS_BY_CODE: Record<HouseErrorCode, HttpStatus> = {
  HOUSE_NAME_INVALID: HttpStatus.BAD_REQUEST,
  HOUSE_NOTE_INVALID: HttpStatus.BAD_REQUEST,
  HOUSE_NOT_FOUND: HttpStatus.NOT_FOUND,
  HOUSE_HAS_TICKETS: HttpStatus.CONFLICT,
};

export class HouseError extends HttpException {
  constructor(code: HouseErrorCode, message: string) {
    super({ code, message }, STATUS_BY_CODE[code]);
  }
}
