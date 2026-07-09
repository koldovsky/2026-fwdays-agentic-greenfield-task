// Public API of shared/lib/account (GDPR export + delete, NFR-GDPR-01/02).
export {
  exportAccountData,
  deleteAccount,
  type AccountStores,
  type AccountExport,
  type AccountUser,
  type ExportedCvProfile,
} from "./service";
