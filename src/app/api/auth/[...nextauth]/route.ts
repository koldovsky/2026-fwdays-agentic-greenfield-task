// Auth.js HTTP surface (sign-in, sign-out, session, csrf) — thin re-export of
// the handlers configured in src/app/auth.ts (FR-AUTH-01, TC-STACK-07).
import { handlers } from "@/app/auth";

export const { GET, POST } = handlers;
