// Per-key async mutex: tasks with the same key run strictly one after
// another; different keys run in parallel. In-memory is a correct
// concurrency control here because the app is fixed to a single instance
// (ADR-0002/ADR-0003) — no cross-process coordination exists to lose.
// Closes the S-02 review findings: rate-limit TOCTOU and attempt-counter
// races in OtpService (slice-reviewer, ADR-0010).
export class KeyedMutex {
  private readonly tails = new Map<string, Promise<void>>();

  run<T>(key: string, task: () => Promise<T>): Promise<T> {
    const prev = this.tails.get(key) ?? Promise.resolve();
    const result = prev.then(task);
    const tail = result.then(
      () => undefined,
      () => undefined,
    );
    this.tails.set(key, tail);
    void tail.then(() => {
      if (this.tails.get(key) === tail) this.tails.delete(key);
    });
    return result;
  }
}
