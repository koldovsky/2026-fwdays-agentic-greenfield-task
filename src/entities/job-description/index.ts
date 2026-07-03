// Public API barrel for the job-description entity — other layers import ONLY this.
export type { JobDescription, RankedRequirement } from "./model/types";
export { normalizeJdText, buildJobDescription } from "./lib/normalize";
