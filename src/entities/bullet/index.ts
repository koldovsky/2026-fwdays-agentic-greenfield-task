// Public API barrel for the bullet entity — other layers import ONLY this.
export type { Bullet, BulletGroundingStatus } from "./model/types";
export {
  defaultIncludeInExport,
  applyExportDefaults,
  exportBullets,
} from "./lib/export";
