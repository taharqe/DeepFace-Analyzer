# AURA

A skincare onboarding app built from a measurement spec.

Every colour, radius, gap and shadow in this codebase traces to a value extracted
from a 50-screen capture set by pixel analysis. Where a value could not be
measured, it is marked as such at its definition. See
[`docs/MEASUREMENT-SPEC.md`](docs/MEASUREMENT-SPEC.md).

## Running it

```bash
npm install
npx expo start
```

Then press `i` for the iOS simulator, `a` for Android, or scan the QR code with
Expo Go.

To render it in a browser instead:

```bash
npx expo start --web
```

## Checks

```bash
npm run check            # tsc --noEmit && contrast assertions
npm run typecheck        # tsc --noEmit
npm run verify:contrast  # node scripts/verify-contrast.mjs
```

`verify:contrast` asserts two things: that every foreground/background pairing the
components actually render clears WCAG AA, and that every *forbidden* pairing still
fails. The second half matters more than it looks. White text on the pink badge
reads as correct to almost everyone until it is measured at 2.21:1 — the guard
means restoring it fails the check instead of shipping.

## Provenance markers

The system's one non-negotiable discipline: an estimate never passes for a
measurement. Each marker travels with the value it describes, into the source.

| | Meaning |
|---|---|
| `[M]` | Measured off the captures by script. Reproducible, exact in px. |
| `[D]` | Derived from a measurement via the scale factor or a curve fit. ±1.5%. |
| `[E]` | Not observable in a still — motion, haptics, dark mode. A proposal. |

If you add a value that cannot be traced to the spec, mark it `[E]` and say why.

## Layout

```
app/                      expo-router routes
├── _layout.tsx           providers · no native headers anywhere
├── index.tsx             welcome
├── onboarding/           age · concerns · tailoring · paywall
└── (tabs)/               today · products · scan · insights · you

src/
├── theme/                tokens + ThemeProvider
├── components/
│   ├── primitives/       Text Badge Button Card OptionRow ProgressTrack StickyDock
│   ├── feedback/         Scrim Sheet
│   └── domain/           ScoreBadge ProductCard PlanRow PriceOption AssistantBubble
├── features/
│   ├── onboarding/       questions (verbatim copy) · state reducer
│   └── catalogue/        product data · score banding
└── lib/                  formatting

scripts/verify-contrast.mjs
docs/MEASUREMENT-SPEC.md
```

Layering runs one direction: screens use domain components, domain uses primitives,
primitives use tokens. A primitive never imports a product concept, and a screen
never touches a hex value.

## Two rules worth knowing before you change anything

**The two-accent rule.** Indigo (`#5363FF`) means commitment — CTAs, filled tracks,
verification. Pink (`#FF88BB`) means selection — checked controls, and nothing else.
Across all 50 captured screens these never swap. There is deliberately no pink
button component; a pink CTA would promise the wrong thing.

**The advance rule.** A single-select answer is complete the moment it is tapped, so
the row advances and the screen has no CTA at all. A multi-select answer is complete
only when the user says so, so rows toggle and a CTA in the dock advances. This is
why `OptionRow` takes a `mode` — collapsing the two breaks the grammar in a way that
reads as a bug long before anyone can name it.

## Known gaps

These are unresolved, not oversights:

- **No dark theme.** The corpus is 50 light screens. Inverting the palette
  mechanically would destroy both the two-accent rule and every ink-on-fill contrast
  fix.
- **No persistence.** Onboarding answers live in memory. Nothing in the captures
  shows whether a killed app resumes mid-flow. `src/features/onboarding/state.tsx`
  is the single place to add storage.
- **No measured colour below a 70% match score.** Two score colours exist, banded at
  90 and 70. Nothing lower appears in any capture, so the band falls back to
  neutral rather than inventing a warning red.
- **Motion and haptics are proposals.** Press feedback, sheet entry, and the
  tailoring count animation are all `[E]`.
- **`Text.tsx`, `Badge.tsx`, `OptionRow.tsx`, `StickyDock.tsx` and
  `ThemeProvider.tsx` are reconstructions.** The originals were provided as iCloud
  placeholder files containing metadata only, so these were rebuilt from the spec
  and should be diffed against the originals when available.

## Licence

Not yet chosen. `create-expo-app` emits an MIT file carrying Expo's copyright; it
was removed rather than left to imply a licence this project has not picked.
