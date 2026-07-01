// Progress-photo trigger keyword (US-8, design D3). A caption naming "progress" opts the photo into
// the progress flow instead of the food-plate path. One anchored, case-insensitive regex covers all
// three languages: RU `прогресс`, UA `прогрес`, EN `progress`. The UA form is a prefix of the RU one
// (both start `прогрес`), so `прогресс?` matches either; `progress` is the Latin form.
//
// Intentional collision (accepted, design Risks): a *food* photo captioned with the word "progress"
// would divert here. The keyword is an explicit opt-in — a user photographing a plate is unlikely to
// caption it `прогресс` — so we accept the false-positive rather than add a disambiguation round.
const PROGRESS_KEYWORD = /прогрес(с)?|progress/i;

/** True when the caption names a progress keyword (RU/UA/EN, any case, anywhere in the text). */
export const isProgressCaption = (caption: string): boolean => PROGRESS_KEYWORD.test(caption);
