// Public API for shared/lib/rate-limit — sliding-window rate limiting
// (NFR-SEC-04, NFR-COST-02). The pure core is unit-tested directly; route
// handlers use the in-memory adapter exported here.
export {
  reserveHit,
  releaseHit,
  type RateLimitParams,
  type ReserveResult,
  type RateLimitStore,
} from "./lib/rate-limit";
export { reserveHitInMemory, releaseHitInMemory } from "./lib/in-memory-adapter";
export { clientIpFrom } from "./lib/client-ip";
