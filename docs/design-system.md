# Design system — Cahier raffiné

Living record of the visual/UX decisions for the JubilateSchool platform (`/app/*`).
If you change something here, explain why. If you override a rule, document it.

---

## 1. Direction: "Cahier raffiné"

A scholarly, ink-on-paper aesthetic with Swiss-editorial restraint and five
deliberate playful moments. The goal is a platform that inspires **confidence
that it works reliably** while leaving room for **subtle playfulness**.

The user is a teacher and her students — the tone must be professional and
respectful, not childish.

**Scope**: this system applies *only* to the authenticated platform at
`/app/*`. The public landing page and auth pages keep their existing theme.
Enforced mechanically via a nested `ThemeProvider` in `PlatformLayout.tsx`.

---

## 2. Tokens

Canonical source: `src/components/platformTheme.ts` (exported `palette` object).

### Color

| Role | Hex | Use |
|------|-----|-----|
| `ink` | `#1A1F3E` | Primary text, AppBar, primary button fill |
| `inkSoft` | `#3B4160` | Secondary text |
| `inkMute` | `#6D7189` | Muted labels, captions |
| `inkFaint` | `#A0A3B6` | Disabled, very muted |
| `cream` | `#FAF7F2` | Page background, text on dark |
| `creamDeep` | `#F2EDE3` | Table headers, zebra rows, drawer hover |
| `ivory` | `#FBF9F5` | Card/table/dialog surface |
| `hairline` | `#E5E0D5` | Dividers, card borders |
| `hairlineStrong` | `#D3CCBB` | Input borders, emphasized dividers |
| `accent` | `#C86A4D` | Terracotta — the single playful spark |
| `sage` | `#6B8E5A` | Confirmed / success |
| `brick` | `#B8594D` | Rejected / destructive |
| `ochre` | `#B8903A` | Pending / warning |

**Decision — why soften `#030340` to `#1A1F3E`?** The original navy read as
loud and aggressive in a dense UI. `#1A1F3E` has the same navy identity but
sits calmer next to body copy. The landing page still uses the original to
keep its current feel intact.

**Decision — single accent color.** Terracotta is *the* playful accent. Do
not introduce second or third accents. Extra color diffuses the signal.

**Decision — muted semantics.** Standard MUI success/warning/error colors
shout. Sage/ochre/brick are lower-saturation variants that read clearly
without overpowering the refined base.

### Typography

| Family | Role |
|--------|------|
| **Fraunces** (variable, opsz 9–144, SOFT) | Display: page titles, section headings, statistic numerals, dialog titles, table totals |
| **Public Sans** | Body, labels, buttons, table cells |
| **Kalam** (handwritten) | Reserved — used *only* for the logo/wordmark in the AppBar. Nowhere else. |

Loaded in `index.html` via a single Google Fonts request.

**Decision — Kalam demotion.** Previously Kalam was applied to every H4/H5
page title (`font-family: 'Kalam', cursive`). This diluted the handwritten
feel and made the platform look a bit childish. Kalam is now a signature
touch used in one place, so it works *as* a signature. The platform's
trustworthy voice comes from Fraunces + Public Sans.

**Decision — Fraunces for numerals.** Every stat value, currency total,
percentage, and time uses Fraunces with `tabular-nums`. Numerals carry a
lot of weight in an admin UI (dashboards, accounting, bookings) and a
refined serif immediately communicates "this is accounting-grade, not a toy."

### Layout & shape

- Border radius: `8px` default; `10–12px` for surfaces (cards, dialogs,
  tables)
- Content max-width: `1100–1180px` to keep tables readable on wide screens
- Content padding: `2.5rem` (mobile) → `4rem` (desktop)
- No shadows beyond a 1px hover-lift (`0 1px 0 rgba(26, 31, 62, 0.04)`).
  Elevation comes from borders and backgrounds, not blur.

---

## 3. Atmosphere

### Dot-grid background

A quiet radial-gradient pattern behind the content area creates a "paper"
feel without interfering with reading.

- Colour: `rgba(26, 31, 62, 0.09)`
- Size: `0.7px` dots on a `26px` grid

**Decision — visibility.** Originally `#D3CCBB` at 24px (too loud, fought
with text). Tried `rgba(26,31,62,0.035)` at 28px (invisible, no value).
Current `0.09` opacity at 26px hits the sweet spot: visible as texture,
invisible as pattern.

---

## 4. Five playful moments

The design deliberately limits itself to five interactive delights. Each is
small (≤300ms), earns its keep, and is listed here so additions are
conscious, not accidental.

1. **Drawer logo tilt**, `transform: rotate(-2deg)` on hover
   (`.platform-logo` class in `platform.css`)
2. **Stat card lift**, `transform: translateY(-1px)` + subtle shadow on hover
   (`StatCard` component)
3. **Pending-request pulse**, soft terracotta dot on pending/awaiting stats
   (`PulseDot` in `StatCard`, enabled via `pulse={true}`)
4. **Confirmed chip stamp**, `rotate(-0.5deg)` — barely visible but delightful
   (`StatusChip` when status is `confirmed`)
5. **Hand-drawn checkmark**, SVG `stroke-dasharray` draws itself on success
   (`.js-check-draw` class; used in `BookingSuccess` and the dashboard
   rate-saved snackbar)

**Rule**: no sixth playful moment without retiring one first. More delights
= less delight.

---

## 5. Component patterns

### PageTitle (`src/components/platform/PageTitle.tsx`)

Every platform page opens with the same three-layer title:

```
KICKER (all caps, tracked, terracotta)
Page title — Fraunces display, Kalam-ish underline stroke
Subtitle — body, inkMute, max 640px
```

Why: the kicker gives context (which space you're in — dashboard, admin,
etc.), the Fraunces title gives the page gravity, the underline stroke is
the hand-drawn hint that ties back to the Kalam wordmark.

### StatusChip (`src/components/platform/StatusChip.tsx`)

Booking statuses use outlined + tinted-fill chips, italic lowercase labels.
A small `rotate(-0.5deg)` on the `confirmed` variant to feel "stamped."

Why outlined + tinted: default MUI filled chips shout. The outlined
treatment keeps the status legible without dominating the row.

Why italic: italic lowercase reads as commentary ("à confirmer",
"confirmé") rather than a classification badge.

### StatCard (`src/components/platform/StatCard.tsx`)

Stat cards follow an editorial hierarchy:

```
LABEL (small-caps, tracked, muted)           [icon — corner, outline, 18px]
Numeral (Fraunces, ~2.5rem, tabular-nums, ink)
Delta (body2, muted)
```

Why: the numeral is the hero. Label and icon are supporting cast. Big
bold icons (as in the old design) compete with the number and create
visual noise.

### Dialogs

Every platform dialog gets a 3px terracotta top edge (via `::before`
pseudo-element on the Paper) — a subtle sign of "this is a focused action."

`overflow: hidden` is required on the Paper to clip inner backgrounds (like
the cream-colored DialogActions footer) to the dialog's rounded corners.
We initially had `overflow: visible` to show the accent strip, but that
let the action-bar footer and the strip itself protrude past the rounded
corners. **Fix, 2026-04-20**: switched to `overflow: hidden` and let the
clip mask do the work.

### Buttons

Three variants with clear rules:

| Variant | When | Style |
|---------|------|-------|
| `variant="contained"` (primary) | Primary CTA — book, save, **Join Zoom** | Ink navy, turns terracotta on hover, arrow endIcon where appropriate |
| `variant="outlined"` (ghost) | Secondary action — Cancel, Close | Hairline border, ink text, darkens on hover |
| `variant="outlined"` with brick color | Destructive — cancel a booking | Brick outline + brick text |

**Decision — Join Zoom is always `contained`.** It's the primary action
when you're about to enter a class. Treating it as outlined made it
compete with Cancel; users couldn't tell which was the intended action.

**Decision — no uppercase.** MUI's default `text-transform: uppercase` on
buttons reads as loud and SaaS-generic. All buttons use their natural case.

**Decision — arrow endIcon on "entry" actions.** Join Zoom, Réserver,
"Voir comme", etc. — anything that takes you somewhere gets the `→` glyph
that slides on hover. It reinforces the "going somewhere" intention.

### AppBar

- Background: navy `ink`
- Text/icon children: inherit cream via a theme rule
  (`"& .MuiTypography-root": { color: "inherit" }`) — MUI's default
  Typography colors would otherwise paint dark text on the navy background
- Kalam wordmark lives here (the only place Kalam appears)

**Decision — remove the Kalam wordmark from the drawer too, bump the logo.**
Having Kalam in both the drawer *and* the AppBar was redundant and made
the logo feel cramped. Drawer now shows only the logo (2.8em), AppBar
keeps the wordmark.

### Drawer

- Background: ivory (contrasts with navy AppBar, ties into content)
- Active nav item: 4px terracotta dot left of the label. No row fill.
- Hover: faint cream-deep background. No accent creeping in on hover.

**Decision — dot over row-fill for active state.** Row-fills make the
drawer feel like a file explorer; the dot feels like a bookmark or
margin mark, consistent with the paper aesthetic.

### Tables

- Header: small-caps, tracked, mute color on cream-deep background
- Rows: hairline dividers, ivory surface
- Hover: cream row background
- Numerals: always `tabular-nums`, right-aligned, font-weight 500

**Decision — no dark thead.** The original navy thead was visually
aggressive. The small-caps mute-color header carries the "this is a table
header" signal without the visual weight.

---

## 6. FullCalendar treatment

Override file: `src/components/platform/platform.css` (scoped under
`.platform-root` so overrides don't leak).

Slot palette (classes applied via `eventClassNames`):

| Class | State | Treatment |
|-------|-------|-----------|
| `js-slot--available` | Open slot (student view) | Ivory fill, dashed navy border, crosshair cursor. Border solidifies on hover. |
| `js-slot--reserved` | Slot reserved for you | Terracotta fill, cream text |
| `js-slot--mine-confirmed` | Student's own confirmed booking | Sage fill, cream text |
| `js-slot--mine-pending` | Student's own pending booking | Ochre fill, cream text |
| `js-slot--teacher-confirmed` | Teacher view of a confirmed booking | Navy fill, cream text |
| `js-slot--teacher-pending` | Teacher view of a pending booking | Ochre fill, cream text |
| `js-slot--booked` | Taken slot (student view of someone else's booking) | Diagonal-hatch fill, muted grey text, not-allowed cursor |

Other details:
- Column separators: dashed (notebook ruled lines)
- Today column: very faint terracotta tint
- Today's day-number: terracotta dot suffix
- Now indicator: terracotta line
- Toolbar buttons: outlined, not the default MUI filled blue

**Bug/fix 2026-04-20**: inner `.fc-event-title` and `.fc-event-time` text
on dark-background slots was rendering invisible. Root cause: the
`--fc-event-text-color: #1A1F3E` variable (set globally for legibility on
light slots) cascades to inner text and beats the outer `color` override.
Fix: explicitly set `color: #FAF7F2` on `.fc-event-main`, `.fc-event-title`,
`.fc-event-time` inside every dark-background class.

---

## 7. Copy rules

### Vouvoiement

All French user-facing copy uses `vous/votre/vos` — never `tu/te/toi/ton/
ta/tes`. This applies to UI labels, emails, placeholders, notifications,
callouts, dialogs, and buttons.

Why: the platform is a paid tutoring service. Professional tone matters
even when addressing students. Also consistent with the teacher's
expected register toward her clients.

How to verify: before merging copy changes, grep for `\b(tu|toi|ton|ta|
tes)\b|\bte[- ]|\bt'` in changed files.

### No emojis in UI

None in labels, buttons, toasts, chips, or placeholders. The design's
warmth comes from typography and color; emojis fight that.

---

## 8. Hard "don'ts"

- **No gradients** (especially not purple gradients on white — too AI-default)
- **No glassmorphism**
- **No scroll-triggered animations**
- **No page-load stagger reveals** — they're showy for a frequently-visited
  platform
- **No MUI default primary blue (`#1976d2`)** anywhere
- **No Zoom-brand blue (`#2D8CFF`)** on Join Zoom buttons
- **No uppercase button text** (global `textTransform: none`)
- **No new accent color** beyond terracotta without retiring it first

---

## 9. Architecture decisions

### Why a nested ThemeProvider?

`PlatformLayout.tsx` wraps its outlet in `<ThemeProvider theme={platformTheme}>`.
The outer `main.tsx` keeps the existing theme for the landing + auth pages.

Alternative considered: replace `theme.ts` globally. Rejected — the
landing page's Kalam-heavy, textShadow-drenched look is part of the
site's identity and redesigning it was out of scope.

Consequence: any new platform page inherits the new theme automatically
(via routing). Any landing-page component added under `/app/*` would
need to be aware of the new theme.

### Why colocate helper components under `src/components/platform/`?

Three reusable helpers (`PageTitle`, `StatCard`, `StatusChip`) are not
used on the landing page. Keeping them in a sibling folder of
`platform.css` makes the scope explicit and signals "this is platform-only
UI." Barrel export in `src/components/platform/index.ts`.

### Why a plain `.css` file for FullCalendar overrides?

FullCalendar's internal selectors (`.fc-event-main`, `.fc-timegrid-slot`,
etc.) are awkward to express through MUI's `sx` or `styled`. A scoped
`.platform-root .fc ...` stylesheet is cleaner. The file is imported from
`PlatformLayout.tsx` so it only loads when the platform is in use.

---

## 10. Open questions / follow-ups

- [ ] Mobile drawer — the brand area still uses 240px. Tight on small phones.
- [ ] `translations.json` has some legacy strings using `tu`. Scoped sweep
      needed before the redesign ships publicly.
- [ ] Empty states on bookings / students / calendar could use a tiny
      hand-drawn line-art glyph (pencil, notebook). Currently just italic
      text. Low priority — works without it.
- [ ] Impersonation banner still uses the ochre color and feels bolted-on.
      Could get a dashed border and a small "impersonating" italic label
      instead of a solid orange bar.
- [ ] The prev/next/today FullCalendar toolbar buttons stack awkwardly on
      narrow screens. Consider a mobile-specific toolbar.
