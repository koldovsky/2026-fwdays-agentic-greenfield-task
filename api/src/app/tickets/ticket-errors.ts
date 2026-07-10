import { HttpException, HttpStatus } from '@nestjs/common';

// Machine-readable error contract (same as auth/house errors): the API stays
// locale-free, the SPA maps codes to Ukrainian messages; e2e asserts codes.
// TICKET_NOT_FOUND and TICKET_HOUSE_NOT_FOUND cover both "missing" and
// "foreign" with an identical body — FR-ACCESS-01 forbids distinguishing
// them. TICKET_HOUSE_INVALID is the 400 shape error for a missing or
// non-numeric houseId (spec: absent required fields are 400, not 404).
// TICKET_STATUS_INVALID is the 400 for a transition target that is not a
// status at all; TICKET_TRANSITION_FORBIDDEN is the 409 for a real status
// that the PRD §5.1 table does not allow from the current one (FR-STATUS-02).
// TICKET_QUERY_INVALID is the 400 for malformed list query params — bad
// filters fail loudly instead of being silently ignored (S-06 design D7).
export type TicketErrorCode =
  | 'TICKET_TITLE_INVALID'
  | 'TICKET_DESCRIPTION_INVALID'
  | 'TICKET_CATEGORY_INVALID'
  | 'TICKET_PRIORITY_INVALID'
  | 'TICKET_REQUESTER_INVALID'
  | 'TICKET_EXECUTOR_INVALID'
  | 'TICKET_DUE_DATE_INVALID'
  | 'TICKET_HOUSE_INVALID'
  | 'TICKET_STATUS_INVALID'
  | 'TICKET_NOTE_INVALID'
  | 'TICKET_QUERY_INVALID'
  | 'TICKET_TRANSITION_FORBIDDEN'
  | 'TICKET_HOUSE_NOT_FOUND'
  | 'TICKET_NOT_FOUND';

const STATUS_BY_CODE: Record<TicketErrorCode, HttpStatus> = {
  TICKET_TITLE_INVALID: HttpStatus.BAD_REQUEST,
  TICKET_DESCRIPTION_INVALID: HttpStatus.BAD_REQUEST,
  TICKET_CATEGORY_INVALID: HttpStatus.BAD_REQUEST,
  TICKET_PRIORITY_INVALID: HttpStatus.BAD_REQUEST,
  TICKET_REQUESTER_INVALID: HttpStatus.BAD_REQUEST,
  TICKET_EXECUTOR_INVALID: HttpStatus.BAD_REQUEST,
  TICKET_DUE_DATE_INVALID: HttpStatus.BAD_REQUEST,
  TICKET_HOUSE_INVALID: HttpStatus.BAD_REQUEST,
  TICKET_STATUS_INVALID: HttpStatus.BAD_REQUEST,
  TICKET_NOTE_INVALID: HttpStatus.BAD_REQUEST,
  TICKET_QUERY_INVALID: HttpStatus.BAD_REQUEST,
  TICKET_TRANSITION_FORBIDDEN: HttpStatus.CONFLICT,
  TICKET_HOUSE_NOT_FOUND: HttpStatus.NOT_FOUND,
  TICKET_NOT_FOUND: HttpStatus.NOT_FOUND,
};

export class TicketError extends HttpException {
  constructor(code: TicketErrorCode, message: string) {
    super({ code, message }, STATUS_BY_CODE[code]);
  }
}
