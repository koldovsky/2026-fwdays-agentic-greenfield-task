export { ContactNotFoundError, InvalidContactError } from "./errors";
export {
  contactPath,
  getContact,
  getContactsDir,
  isSafeInn,
  listContacts,
  normalizeContact,
  putContact,
} from "./store";
export type { ContactRef } from "../document-session";
