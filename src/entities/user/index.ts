// Public API barrel for the user entity — other layers import ONLY this.
export type { User, AuthProvider } from "./model/types";
export { isAnonymous, displayLabel } from "./lib/user";
