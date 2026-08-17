export class InvalidDateError extends Error {
  readonly code = "INVALID_DATE" as const;

  constructor(date: string) {
    super(`Invalid document date: ${date}`);
    this.name = "InvalidDateError";
  }
}
