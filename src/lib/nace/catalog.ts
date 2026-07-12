import type { NaceEntry } from "@/lib/nace/types";

/**
 * MVP seed catalog — creative-services subset of NACE 2.1-UA
 * (FR-NACE-02/03/04). Bilingual line texts are authoritative per
 * openspec/specs/nace-catalog/spec.md; official UA class names per
 * docs/191_2025.pdf. Compiled-in typed data, no storage (TC-STACK-04).
 *
 * Keyword curation (design D3 risk note): 3D/visualization keywords live
 * only on the 3D entries so that mixed input like «3D дизайн» surfaces the
 * ambiguity instead of silently picking one 74.12 entry.
 */
export const naceCatalog: readonly NaceEntry[] = [
  {
    id: "graphic-design",
    naceClass: "74.12",
    officialNameUa: "Діяльність із графічного та візуального дизайну",
    lineTextEn:
      "Graphic design services: development of logos, corporate identity, brand book and related graphic design services",
    lineTextUa:
      "Послуги графічного дизайну: розробка логотипів, фірмового стилю, брендбуку та інші послуги у сфері графічного дизайну",
    legacyKvedClass: "74.10",
    keywords: [
      "графічн",
      "дизайн",
      "логотип",
      "лого",
      "фірмовий стиль",
      "брендбук",
      "бренд",
      "айдентик",
      "graphic",
      "design",
      "logo",
      "brand",
      "brand book",
      "identity",
      "corporate identity",
    ],
  },
  {
    id: "visualization-3d-360",
    naceClass: "74.12",
    officialNameUa: "Діяльність із графічного та візуального дизайну",
    lineTextEn:
      "Graphic 3D design services (visualization): creation of an interactive 360° point for virtual tour",
    lineTextUa:
      "Послуги графічного 3Д дизайну (візуалізації): створення інтерактивної точки 360° для віртуального туру",
    legacyKvedClass: "74.10",
    keywords: [
      "3d",
      "3д",
      "візуалізац",
      "віртуальн",
      "віртуальний тур",
      "панорам",
      "рендер",
      "360",
      "visualization",
      "visualisation",
      "virtual",
      "virtual tour",
      "panorama",
      "render",
    ],
  },
  {
    id: "specialized-design-3d",
    naceClass: "74.14",
    officialNameUa: "Інша спеціалізована діяльність із дизайну",
    lineTextEn:
      "Specialized design services (3D / interactive visualization) as per agreed scope",
    lineTextUa:
      "Спеціалізовані послуги з дизайну (3D / інтерактивна візуалізація) згідно узгодженого обсягу",
    legacyKvedClass: "74.10",
    keywords: [
      "спеціалізован",
      "спеціалізований дизайн",
      "інтерактив",
      "specialized",
      "specialised",
      "specialized design",
      "interactive",
    ],
  },
  {
    id: "video-post-production",
    naceClass: "59.12",
    officialNameUa: "Компонування кіно- та відеофільмів, телевізійних програм",
    lineTextEn:
      "Video editing services: editing, special effects, color correction and related post-production",
    lineTextUa:
      "Послуги з відеомонтажу: редагування відеоматеріалів, створення спецефектів, кольорокорекція та інші послуги з обробки відео",
    legacyKvedClass: "59.12",
    keywords: [
      "відеомонтаж",
      "монтаж",
      "відео",
      "спецефект",
      "кольорокорекц",
      "обробка відео",
      "video",
      "video editing",
      "editing",
      "montage",
      "color correction",
      "colour correction",
      "post production",
      "postproduction",
      "special effects",
      "vfx",
    ],
  },
];
