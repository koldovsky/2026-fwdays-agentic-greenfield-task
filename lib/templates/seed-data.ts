import { templateSchema, type Template } from "../schemas/template.ts";

/**
 * The two seeded, read-only templates (FR-TPL-01): a probation check-in and a
 * peer feedback round, with distinct names and distinct methodologies. Each is
 * a mix of `scale` (labelled integer anchors) and `open` questions, with
 * `order` contiguous from 1.
 *
 * The content here is the seeded template text — it is NOT runtime-localised
 * (seeded template content localisation is out of scope per the spec). Each
 * template is parsed by `templateSchema` at module load, so a malformed seed
 * fails fast at import time, before any write. Framework-free.
 *
 * Question `id`s are NOT carried here: the database generates stable cuids on
 * first seed, and the seed script keys questions by `order` so re-runs leave
 * existing ids untouched (downstream cycle snapshots reference them).
 */

/** A reusable 1–5 agreement scale used by several scale questions. */
const agreementAnchors = [
  { value: 1, label: "Зовсім не погоджуюсь" },
  { value: 2, label: "Радше не погоджуюсь" },
  { value: 3, label: "Нейтрально" },
  { value: 4, label: "Радше погоджуюсь" },
  { value: 5, label: "Цілком погоджуюсь" },
];

const probationCheckIn = {
  name: "Випробувальний період",
  methodology: "probation",
  questions: [
    {
      id: "probation-q1",
      order: 1,
      text: "Працівник чітко розуміє очікування від своєї ролі.",
      type: "scale",
      required: true,
      anchors: agreementAnchors,
    },
    {
      id: "probation-q2",
      order: 2,
      text: "Якість роботи відповідає очікуванням для цієї посади.",
      type: "scale",
      required: true,
      anchors: agreementAnchors,
    },
    {
      id: "probation-q3",
      order: 3,
      text: "Працівник конструктивно сприймає зворотний зв’язок.",
      type: "scale",
      required: true,
      anchors: agreementAnchors,
    },
    {
      id: "probation-q4",
      order: 4,
      text: "Що працівникові вдається найкраще на цьому етапі?",
      type: "open",
      required: true,
    },
    {
      id: "probation-q5",
      order: 5,
      text: "Над чим варто попрацювати до завершення випробувального періоду?",
      type: "open",
      required: false,
    },
  ],
};

const peerFeedback = {
  name: "Зворотний зв’язок від колег",
  methodology: "peer-360",
  questions: [
    {
      id: "peer-q1",
      order: 1,
      text: "Колега ефективно співпрацює в команді.",
      type: "scale",
      required: true,
      anchors: agreementAnchors,
    },
    {
      id: "peer-q2",
      order: 2,
      text: "Комунікація колеги зрозуміла та вчасна.",
      type: "scale",
      required: true,
      anchors: agreementAnchors,
    },
    {
      id: "peer-q3",
      order: 3,
      text: "Наскільки ймовірно ви порадили б працювати з цим колегою?",
      type: "scale",
      required: true,
      anchors: [
        { value: 1, label: "Дуже малоймовірно" },
        { value: 2, label: "Малоймовірно" },
        { value: 3, label: "Можливо" },
        { value: 4, label: "Імовірно" },
        { value: 5, label: "Дуже ймовірно" },
      ],
    },
    {
      id: "peer-q4",
      order: 4,
      text: "Які сильні сторони колеги ви відзначаєте?",
      type: "open",
      required: true,
    },
    {
      id: "peer-q5",
      order: 5,
      text: "Що могло б допомогти колезі працювати ще краще?",
      type: "open",
      required: false,
    },
  ],
};

/**
 * The seed templates, each validated by `templateSchema` at module load. The
 * parse normalises and proves the data; `seedTemplates` is the typed result the
 * seed script and tests consume.
 */
export const seedTemplates: readonly Template[] = [
  templateSchema.parse(probationCheckIn),
  templateSchema.parse(peerFeedback),
];
