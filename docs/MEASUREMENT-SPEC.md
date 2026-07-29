# AURA — Design System v0.1.0

**Draft for engineering.** Every value below was extracted from a 50-screen capture
set by pixel analysis — not sampled by eye. Where a value could not be measured, it
says so, in the same place you'd read the number.

| | |
|---|---|
| Captures | 50 |
| Source px | 728×1568 |
| px per pt | 1.85 |
| Colours measured | 14 |
| Radii arc-fitted | 5 |
| Blur treatments solved | 2 |
| Components | 30 |

## Provenance markers

- **[M] MEASURED** — read off the captures by script. Reproducible, exact in px.
- **[D] DERIVED** — computed from a measurement via the scale factor or curve-fit. ±1.5%.
- **[E] ESTIMATED** — not observable in a still — motion, haptics, error states. A proposal.

---

## 01 — Colour

| | Token | Value | Note |
|---|---|---|---|
| M | bg / canvas | `#F6F5F3` | 100.0% purity · quiet band |
| M | bg / surface | `#FFFFFF` | 2% step from canvas · no borders anywhere |
| M | bg / assistant | `#F9F4F8` | warm lilac · speech bubble only |
| M | action / primary | `#5363FF` | FLAT fill · core spread R6 G5 B1 |
| M | action / selection | `#FF88BB` | 4 samples · Δ ≤ 4/255 |
| M | score / high | `#B16BFF` | ≥90% match |
| M | score / mid | `#40BB7C` | 70–89% match |
| M | accent / commerce | `#F8D94B` | price pills only |
| M | void | `#030B0E` → `#0B1C2C` | analysis sequence |
| M | success flood | `#019A88` → `#00B1D3` | resolution frame |
| M | fg / primary | `#0B0B0A` | 18.07:1 on canvas |
| D | fg / secondary | `#6B6864` | corrected from `#838383` — see contrast |

**The two-accent rule.** Indigo means commitment — CTAs, filled tracks, verification.
Pink means selection — checked controls, and nothing else. Across 50 screens these
never swap roles. That discipline is the most transferable thing in the whole corpus.

## 02 — Radius

`r = 60px` against `h = 120px`.

| dy | Measured inset | r=60 predicts | |
|---|---|---|---|
| 10px | 26px | 26.8px | ✓ |
| 20px | 15px | 15.3px | ✓ |
| 30px | 8px | 8.0px | ✓ |
| 40px | 3px | 3.4px | ✓ |

`r = 60px` is exactly half the 120px row height. These are true capsules, so the
token is `9999` — never a literal.

Arc-fitting four more components gives the real ladder: **12** (search, 13.2
measured) · **16** (shortcut card, 17.0) · **22** (section 21.9, tile 23.0) ·
**capsule**. The 28 and 36 in the first draft were extrapolated and appear nowhere
in the corpus.

## 03 — Type

Derived from measured cap heights.

| Style | Size/leading · weight | Specimen |
|---|---|---|
| display.lg | 32/38 · 700 | Let's commit |
| display.md | 28/34 · 700 | Unlock Premium |
| title.lg | 24/30 · 700 | How old are you? |
| title.md | 20/26 · 600 | Results with routine |
| title.sm | 17/22 · 600 | Soy Face Cleanser |
| body.lg | 17/24 · 400 | At different ages, your skin needs different care. |
| body.md | 16/22 · 400 | Under 25 |
| label.md | 13/16 · 600 | 99% fit |
| caption | 12/16 · 400 | Peach & Lily |

## 04 — Spacing

4pt base: 1·4 · **2·8 [M]** · 3·12 · 4·16 · **6·24 [D]** · 8·32 · 10·40 · 12·48 · 16·64

Inter-card gap measured at 15px → 8.1pt. That it lands so cleanly on 8 is what
confirmed the 1.85 scale factor: at any other candidate device scale it resolves to
8.9pt, which no one would ever ship as a token.

## 05 — Components

Live behaviour, from the interactive prototype:

- Badges: `Sulfate-free`, `Fragrance-free`, `Non-comedogenic`, `99% fit`, `76% fit`,
  `Selected`, `€39.99`
- Badge text is ink, not white. White-on-pink measures 2.21:1 and fails WCAG
  outright; ink-on-pink measures 8.90:1 and keeps the brand fill untouched.
  Darkening the fills instead doesn't work — the obvious fix tops out at 3.82:1.

## 06 — Contrast audit

| Pair | Ratio | Verdict |
|---|---|---|
| `#0B0B0A` on `#F6F5F3` | 18.07:1 | AAA |
| `#0B0B0A` on `#FFFFFF` | 19.69:1 | AAA |
| `#838383` on `#FFFFFF` | 3.79:1 | **FAILS** |
| `#6B6864` on `#FFFFFF` (fix) | 5.54:1 | AA |
| `#FFFFFF` on `#5363FF` | 4.57:1 | AA |
| `#FFFFFF` on `#FF88BB` | 2.21:1 | **FAILS** |
| `#0B0B0A` on `#FF88BB` (fix) | 8.90:1 | AA |
| `#FFFFFF` on `#40BB7C` | 2.44:1 | **FAILS** |
| `#0B0B0A` on `#40BB7C` (fix) | 8.08:1 | AA |
| `#0B0B0A` on `#F8D94B` | 14.08:1 | AAA |

## 07 — Shadow & blur

**Card edge.** 12px falloff, peak Δ11/255 at +6px, noise floor by +12px.
→ `0 1.5px 7px rgba(11,11,10,.043)`

**Blur.** Two captures show the same screen clean and blurred behind a modal.
Gaussian-blurring the clean frame and fitting brightness gives:

| σ | scale | rmse | |
|---|---|---|---|
| 12px | 0.414 | 2.837 | |
| 16px | 0.495 | 1.866 | |
| 18px | 0.532 | 1.574 | |
| 20px | 0.567 | 1.455 | **min** |
| 24px | 0.632 | 1.642 | |
| 28px | 0.694 | 2.082 | |

σ = 20px (10.8pt) with 43% dim. A second pair solves to σ = 8px with 52% dim.
Sheets that replace context blur deep and dim light; dialogs that interrupt blur
shallow and dim hard.

## 08 — Interaction grammar

Single-select advances on tap; multi-select gates a CTA.

> Answer complete by definition → advance. Only the user knows they're done → CTA.

---

## Screen flow

1. **Welcome** — "Skin that knows what it needs" / "A few questions, one scan, and a
   routine built only for you." / `Get started` · `I already have an account`
2. **Age** — "How old are you?" / "Skin needs different care at different ages."
   Options: Under 25 · 25 – 34 · 35 – 44 · 45 – 60 · Over 60
3. **Concerns** — "What matters most to you?" / "Pick everything that applies."
   ◇ Fine lines · ○ Visible pores · ◐ Uneven tone · △ Dryness · ▽ Redness · ◈ Dullness
   → `Continue`
4. **Tailoring** — "Tailoring your routine…" / `47750` "products in the catalogue"
   → `Show my routine`
5. **Reveal** — before / after
6. **Paywall** — "Unlock your full routine"
   ✦ Routine built around you · ◹ Track results weekly · ⊙ Rescan any time
   Weekly €5,99 · Yearly **BEST VALUE** €39,99 · billed once a year
   "Charged today. Cancel any time in Settings." → `Continue`
7. **Today** — First steps: Meet your scanner 🧴 · Learn your daily plan 🔒 ·
   Check your skin 🔒. Daily plan: Morning routine 🔒 · Evening routine 🔒
8. **Dock** — ◗ Today · ◫ Products · ⌂ Scan · ◍ Insights · ◯ You

---

## Terms

Structure, spacing, colour relationships and interaction grammar only.
No source wordmark, mascot, illustration, icon artwork or photography reproduced.
