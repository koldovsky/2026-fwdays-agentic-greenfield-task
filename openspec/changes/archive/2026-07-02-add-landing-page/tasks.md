## 1. Scaffold slice

- [x] 1.1 Create `views/landing` slice (ui segment + `index.ts` barrel) via fsd-scaffold, importing only from `widgets`/`shared`
- [x] 1.2 Add static example fixtures (demo bullets, checklist rows, pricing plans, FAQ items) in slice-local `lib`/`model`

## 2. Build sections

- [x] 2.1 Header (sticky nav, logo, links, Sign in / Try free) + footer, from the design reference
- [x] 2.2 Hero + signature demo card (Vouched + overclaim-risk example, match score) using `shared/ui`
- [x] 2.3 Honesty pillars + grounded before/after sections
- [x] 2.4 Checklist preview (gauge/match score + met/partial/gap/overclaim rows) reusing `shared/ui`
- [x] 2.5 How-it-works, pricing table (Free/Pro/Job-hunt Pass), final CTA block
- [x] 2.6 FAQ accordion — accessible button toggles, `aria-expanded`, keyboard operable

## 3. Wire route

- [x] 3.1 Replace inline hero in `src/app/page.tsx` with `views/landing` (thin server leaf); primary CTA links to `/tailor`
- [x] 3.2 Confirm no auto-processing and no third-party trackers on load

## 4. Verify & review

- [x] 4.1 Run agent-verify: `next build`, tsc, lint, tests green; capture FR-SALES-01/02/03 + NFR-A11Y-01 evidence
- [x] 4.2 Brand audit (no new hues/emoji/`!`/icon libs) + Lighthouse a11y ≥ 95
- [x] 4.3 Independent checker-review (maker ≠ checker) vs PRD + DESIGN + FSD import rules
