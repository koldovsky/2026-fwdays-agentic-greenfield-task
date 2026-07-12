# 05 — Look at a real PDF, then decide what "the template is the contract" means

Type: prototype
Status: open
Blocked by: 01

## Question

The approach is settled — see the map's revised settled decision 2. The PDF is
rendered by a **stateless Vercel Route Handler** that prints
`docs/invoice-template.html` with headless Chromium (`puppeteer-core` +
`@sparticuz/chromium`) and retains nothing. `docs/invoice-template.html`
therefore **remains the source of truth** (`TC-STACK-03` survives), and
`BC-LEGAL-01` keeps the artifact it is immutable *in*.

What is not settled is whether it actually works, and at what cost. Build a
throwaway prototype, then look at the printed PDF together with the human.

### The two ways this fails

**It fails to deploy.** `@sparticuz/chromium` is roughly 50 MB. Vercel caps a
Node function at 250 MB uncompressed. Measure the deployed function size, the
cold-start latency, and the render duration against the plan's function timeout.
If it does not fit, `@sparticuz/chromium-min` fetches the Brotli-packed browser
at runtime instead — establish whether that is acceptable, since it is an
outbound fetch on the critical path.

**It deploys and renders tofu.** Ticket `01` showed that Ukrainian glyphs are the
silent failure mode, and the serverless environment makes it worse: a Lambda
filesystem has **no system fonts at all**, so there is nothing to fall back to.

`docs/invoice-template.html:8` reads:

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
```

That URL requests no subset, so Google returns Cyrillic too — which is why the
template renders correctly in a browser today. But inside a cold function it is
an **outbound network request on the critical path**, and `display=swap` means
Chromium will happily print with a fallback that does not exist. Establish how
the font reaches Chromium: inlined as a base64 `@font-face`, shipped as a file
next to the function, or fetched with an explicit `document.fonts.ready` await.
Then verify the glyphs with your eyes.

That question is not cosmetic. `BC-LEGAL-01` says the TERMS AND CONDITIONS block
is immutable in the generated output, and `TC-STACK-03` names the HTML file as
the thing it is immutable *in*. If the PDF is built from different primitives,
"immutable" needs a new anchor — or the two artifacts will drift, exactly as
`docs/Design System/design-tokens.css` and `src/styles/design-tokens.css`
already have.

## What to check on the printed page

- Ukrainian glyphs render — not tofu, not a silent fallback substitution.
  **A successful build proves nothing here.** Ticket `01` showed that
  `@fontsource/inter` ships only subset-scoped files with no combined
  Latin+Cyrillic font, and that `@react-pdf/renderer` accepts TTF/WOFF but not
  the WOFF2 that `next/font` serves. Check the glyphs with your eyes, and check
  `№` (U+2116) in the **English** payment-purpose line specifically — it is a
  Cyrillic-subset character hiding in Latin text.
- Text is selectable and searchable, not a raster image.
- A4 pagination is correct, and the TERMS block is not orphaned across a page
  break.
- The bilingual service rows (`{{SERVICE_ROWS}}`) hold their column alignment
  when the UA line wraps and the EN line does not.
- Monetary columns align (the design system promises tabular numerals via
  `wf-mono`).
- File size is sane to send over Telegram / WhatsApp.

## Fixtures

Use the worked example from `docs/research.md:143-156`: VISIO LLC, Calgary,
USD, "Virtual tour 360° point", quantity 17, total 11 050, 50% prepayment,
3-day payment term, 5-week execution term. It exercises a clean division
(`11050 ÷ 17 = 650.00`) — deliberately pick a second fixture that does not
divide evenly, so ticket `06` has something concrete to look at.

## Output

The prototype, linked from this ticket. The answer records the chosen approach,
the rejected ones and why, and what `TC-STACK-03` and `BC-LEGAL-01` must be
rewritten to say.
