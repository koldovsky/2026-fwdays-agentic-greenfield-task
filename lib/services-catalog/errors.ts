export class InvalidServiceError extends Error {
  readonly code = "INVALID_SERVICE" as const;

  constructor(message: string) {
    super(message);
    this.name = "InvalidServiceError";
  }
}
