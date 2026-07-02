# Design

Authentication uses signed HTTP-only sessions and server-side guards. Persistence is isolated behind a typed repository that reads the JSON aggregates and serializes multi-file mutations through a FIFO queue with staged replacement and rollback.

## Verification

Session tests cover create/read/clear/redirect/admin denial. Repository integration tests use an isolated temporary data directory to prove complete reads, concurrent serialization, and unchanged files after a failed mutation.
