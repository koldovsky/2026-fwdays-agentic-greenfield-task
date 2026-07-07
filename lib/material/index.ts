/**
 * Публічний API матеріальної перевірки (без React/DOM). Переиспользує
 * `buildMaterialDeficits` із `lib/mrp`.
 *
 * @module lib/material
 */
export {
  isCriticalDeficit,
  splitDeficits,
  computeMaterialCheck,
  demandDatesByMaterial,
  type MaterialCheck,
} from './check.ts'
