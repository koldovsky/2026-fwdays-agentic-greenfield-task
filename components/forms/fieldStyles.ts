// «Поливайко» form-field styling (design D4) — shared so every text input,
// label, and hint across the plant/growth/watering forms reads from the same
// tokens. Inputs: paper bg, 1.5px border, radius 13, padding 12px/15px, Mulish;
// focus → forest border + cloud bg. Labels: 13px/600 bark. Hints: stone.

export const fieldInputClass =
  "mt-1 w-full rounded-[13px] border-[1.5px] border-border bg-paper px-[15px] py-3 font-body text-[15px] text-ink placeholder:text-placeholder focus:border-forest focus:bg-cloud focus:outline-none";

export const fieldLabelClass =
  "block font-body text-[13px] font-semibold text-bark";

export const fieldHintClass = "mt-1 font-body text-xs text-stone";
