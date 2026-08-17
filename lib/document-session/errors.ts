export class InvalidGuidError extends Error {
  readonly code = "INVALID_GUID" as const;

  constructor(guid: string) {
    super(`Invalid document session guid: ${guid}`);
    this.name = "InvalidGuidError";
  }
}

export class SessionNotFoundError extends Error {
  readonly code = "NOT_FOUND" as const;

  constructor(guid: string) {
    super(`Document session not found: ${guid}`);
    this.name = "SessionNotFoundError";
  }
}
