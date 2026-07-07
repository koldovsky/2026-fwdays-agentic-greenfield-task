// Public API barrel for the cv-profile entity — other layers import ONLY this.
export type { CvProfile } from "./model/types";
export type { CvDocument, CvRole, CvDateRange, CvContact } from "./model/types";
export { normalizeCvText } from "./lib/normalize";
export {
  parseCvDocument,
  parseDateRange,
  totalTenureMonths,
  tenureYears,
  absMonthOf,
} from "./lib/normalize";
