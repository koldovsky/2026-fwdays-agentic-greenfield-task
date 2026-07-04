# Design: Court availability preview

## Fetch

Playwright opens MHOA tennis form once per request, loops **East Court** and **West Court**, selects parsed date, collects clickable slot links.

Stub mode (`COLIBRI_SUBMIT_MODE !== live`) returns sample slots without contacting MHOA.

## Confirm step

1. After validation passes, fetch availability for `parsed.date`
2. Render two columns: East / West with all available slot labels
3. Highlight slots inside parsed time window
4. Require user to pick a slot (default: first in-window slot, East preferred)
5. Pass `{ court, slotLabel }` to submit API

## Submit

`fillTennisForm` accepts optional `BookingSelection` — clicks exact court and slot label.
