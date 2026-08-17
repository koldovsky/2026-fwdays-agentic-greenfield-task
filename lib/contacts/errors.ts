export class InvalidContactError extends Error {
  readonly code = "INVALID_CONTACT" as const;

  constructor(message: string) {
    super(message);
    this.name = "InvalidContactError";
  }
}

export class ContactNotFoundError extends Error {
  readonly code = "NOT_FOUND" as const;

  constructor(inn: string) {
    super(`Contact not found: ${inn}`);
    this.name = "ContactNotFoundError";
  }
}
