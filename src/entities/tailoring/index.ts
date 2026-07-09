// Public API barrel for the tailoring entity — other layers import ONLY this.
export type {
  Tailoring,
  TailoringChecklistRow,
  TailoringBullet,
  TailoringBulletGrounding,
} from "./model/types";
export { exportableBullets, hasOverclaims } from "./lib/select";
