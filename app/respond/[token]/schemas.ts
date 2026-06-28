// @trace FR-LINK-03 TC-VALID-01
import { z } from "zod";

/**
 * Boundary schema for the respondent token URL parameter.
 * Exactly 43 URL-safe base64url characters — matches the output of
 * `generateCycleToken` (lib/cycles/link-token.ts). Validated before any DB
 * call so oversized or out-of-charset strings are rejected immediately.
 * Shared export: the respond and form slices import from here instead of
 * redefining the regex.
 */
export const tokenBoundarySchema = z.string().regex(/^[A-Za-z0-9_-]{43}$/);
