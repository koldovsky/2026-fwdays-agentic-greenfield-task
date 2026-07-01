# Vouch Design System

## About

Vouch is a Ukrainian-first "Honest Resume Tailor" — a web tool that rewrites CV bullets to fit a specific job description while rigorously grounding every claim in the candidate's actual experience. The product's core differentiator is honesty: it never invents skills, flags overclaim-risk bullets before export, and shows a transparent per-requirement compliance checklist with a weighted match score.

**Key PRD feature refs:**
- FR-CV-01: CV upload (PDF/DOCX)
- FR-JD-01: Job description paste
- FR-TAILOR-01/02: Tailoring pipeline (status, streaming)
- FR-BULLETS-01/02: Grounded bullets, overclaim detection
- FR-CHECKLIST-02/04: Checklist states, match score
- FR-EDIT-02: Manual edit tracking
- FR-SALES-03: Pricing tiers
- BC-BRAND-01: Ukrainian-first product

**Sources:** PRD document (`uploads/cv-agent-requirements.md`) + two design explorations (`Design System.dc.html`, `Landing Page.dc.html`). No Figma file or production codebase was provided.

---

## Content Fundamentals

**Voice:** Direct, calm, honest. Vouch speaks like a knowledgeable colleague who respects your intelligence. No hype, no exclamation points, no marketing fluff.

**Tone:** Warm but precise. The tool handles something personal (your career) with care. Copy acknowledges complexity without catastrophizing.

**Person:** Second person "you/your" for user-facing copy. First person plural "we" only for the product ("we extract a ranked list"). Never "I".

**Language:** English UI and marketing copy. Ukrainian appears in example/sample content (checklist rationale text, grounding references) to reflect the Ukrainian-first audience.

**Casing:**
- UI labels, nav items: Sentence case
- Status tokens (`met`, `partial`, `gap`, `overclaim-risk`): all-lowercase
- Requirement tags (`must`, `nice`): all-lowercase
- Section eyebrows: UPPERCASE · MONOSPACE · TRACKED
- Headings: Sentence case, no trailing period

**Emoji:** Never used. Warmth comes from type and color, not emoji.

**Numbers:** Plain hryvnia sign (₴) for pricing. Specific numbers are always grounded ("6 years React", not "6+ years").

**Good copy examples:**
- "Tailor my CV — free" (not "Get started for free!")
- "Every rewrite stays tied to the truth."
- "Strong, with two honest gaps" (match score summary)
- "No evidence found · excluded from export" (overclaim warning)
- "відредаговано вручну" (Ukrainian inline for manual edits)

---

## Visual Foundations

### Colors
The palette is navy ink + one brand blue. Warmth comes from paper surfaces and type — not hue variety. The four functional status colors are fixed and non-negotiable.

| Name | Token | Value |
|------|-------|-------|
| Ink | `--color-ink` | `#16243d` |
| Brand | `--color-brand` | `#3257c5` |
| Brand wash | `--color-brand-wash` | `#eaf0fd` |
| Ink soft | `--color-ink-soft` | `#5a6678` |
| Ink muted | `--color-ink-muted` | `#94a0b0` |
| Surface card | `--color-surface-card` | `#ffffff` |
| Surface canvas | `--color-surface-canvas` | `#f4f5f7` |
| Surface warm | `--color-surface-warm` | `#faf7f2` |
| Hairline | `--color-hairline` | `#e3e6ea` |
| Hairline warm | `--color-hairline-warm` | `#ece7dd` |
| met | `--color-met` | `#2f8f5b` |
| partial | `--color-partial` | `#c79a1e` |
| gap | `--color-gap` | `#d05151` |
| overclaim | `--color-overclaim` | `#e08a3c` |

### Typography
Two families: **Bricolage Grotesque** (display, headlines, large numerals — warm, slightly characterful) and **Hanken Grotesk** (body, UI, labels — humanist, quietly readable). Both are Google Fonts. System monospace is used for code labels, requirement IDs, and uppercase eyebrows.

Display headings: tight tracking (`−0.02em`), tight leading (`1.04–1.15`).
Body copy: comfortable leading (`1.5–1.6`). No tracking on body text.

### Backgrounds
- Primary page: warm paper `#faf7f2` (editorial direction) or clean white `#ffffff` (product-forward)
- Sections alternate `#ffffff` / `#f4f5f7`
- "Honesty band" / footer CTA: full ink `#16243d` surface
- No full-bleed images, textures, or patterns
- Subtle radial gradient glow (`rgba(50,87,197,0.3–0.4)`) only in dark ink sections

### Animations
Minimal. Streaming progress bar: linear gradient flow. Status transitions are implied, not animated. If motion is added: `ease-out`, 150–200ms. No bounces or spring physics.

### Hover States
- Primary/dark buttons: `opacity: 0.88`
- Ghost/text links: underline appears
- Cards: no state change (static surfaces)
- Upload zone: border color changes to brand blue, background to brand wash

### Press States
Buttons: `transform: scale(0.97)` for 80ms. Color unchanged.

### Borders
- Standard: `1px solid var(--color-hairline)` — `#e3e6ea`
- Warm: `1px solid var(--color-hairline-warm)` — `#ece7dd` (on warm-paper surfaces)
- Brand accent: `1px solid var(--color-brand-wash)` — inside brand-tinted elements
- Dashed: `1.5px dashed #c3cbd6` — upload zones only
- Cards never have colored accent borders on the left

### Cards
White background, hairline border, `var(--radius-xl)` (16px) radius, minimal shadow. Featured/selected card uses ink `#16243d` background. Shadow is `var(--shadow-card)` for static cards; `var(--shadow-float)` for hero demo cards.

### Corner Radii
- Tags, eyebrow chips: `5px`
- Buttons, inputs: `9–12px`
- Cards: `14–20px`
- Logo mark: `7px`
- Status pills, grounding badges: `999px` (full pill)

### Iconography
No icon library. Icons are replaced by:
- Arrow characters (`↑` for upload, `→` for transforms/navigation)
- Colored dot indicators (`border-radius: 50%` spans) for status
- Simple geometric shapes — no SVG paths, no icon fonts

Do not add emoji or icon libraries unless explicitly requested. The restrained approach is intentional — it keeps the design toolkit lightweight and honest.

---

## File Index

```
styles.css                         Entry point — @import list only
tokens/
  colors.css                       Color custom properties
  typography.css                   Type scale + font-family tokens
  spacing.css                      Spacing + border-radius tokens
  shadows.css                      Shadow tokens
assets/
  logo.svg                         Vouch logotype (icon + wordmark)
guidelines/
  brand-colors.card.html           Brand & ink palette specimen
  surface-colors.card.html         Surface color specimen
  status-colors.card.html          Functional checklist state colors
  type-display.card.html           Bricolage Grotesque specimen
  type-body.card.html              Hanken Grotesk specimen
  type-scale.card.html             Full type-scale ramp
  spacing.card.html                Spacing token scale
  radii.card.html                  Border-radius tokens
  shadows.card.html                Shadow system
components/
  core/
    Button.jsx / .d.ts / .prompt.md
    Badge.jsx / .d.ts / .prompt.md
    StatusPill.jsx / .d.ts / .prompt.md
    GroundingBadge.jsx / .d.ts / .prompt.md
    ChecklistRow.jsx / .d.ts / .prompt.md
    MatchScore.jsx / .d.ts / .prompt.md
    PricingCard.jsx / .d.ts / .prompt.md
    UploadZone.jsx / .d.ts / .prompt.md
    core.card.html                 Component preview card
ui_kits/
  vouch/
    index.html                     Main app — upload → results workflow
```
