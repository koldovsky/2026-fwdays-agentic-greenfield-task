// Public API for shared/lib/auth — password hashing + email/password auth service.
export { hashPassword, verifyPassword } from "./password";
export {
  registerWithPassword,
  authenticateWithPassword,
  type PublicUser,
  type Result,
  type AuthDeps,
  type UserStore,
  type CredentialStore,
} from "./service";
