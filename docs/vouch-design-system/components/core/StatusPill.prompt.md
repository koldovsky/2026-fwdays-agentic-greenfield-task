Inline status pill for the Vouch tailoring pipeline. Shows the current job state with a colored dot indicator and text label.

```jsx
<StatusPill status="queued" />
<StatusPill status="processing" />
<StatusPill status="done" />
<StatusPill status="failed" />
```

**State colors:**
- `queued` → neutral grey
- `processing` → brand blue wash
- `done` → met green
- `failed` → gap red

**Usage:** Appears in the top status bar of the tailoring screen, and in job history lists. Do not use for checklist row status — use `GroundingBadge` or the dot indicator in `ChecklistRow` instead.
