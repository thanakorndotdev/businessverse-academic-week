---
name: Businessverse Academic Week
description: A cream and marine academic exhibition guide for connected business decisions.
colors:
  paper: "#f6f6f1"
  white: "#fff"
  ink: "#173540"
  muted: "#607176"
  line: "#dce2dc"
  navy-deep: "#112b35"
  gold: "#eac15c"
  primary-hover: "#264a52"
  gold-hover: "#f3ce77"
  secondary-bg: "#eaf0e8"
  secondary-ink: "#214238"
  target-surface: "#e9ecde"
  selected-surface: "#f0f5e9"
  selected-border: "#487159"
  live-surface: "#dfede1"
  live-ink: "#326348"
  input-border: "#c9d3cc"
  art-management: "#ebe4d3"
  art-management-ink: "#7a693f"
  art-marketing: "#e5eadf"
  art-marketing-ink: "#527057"
  art-esport: "#e5e3eb"
  art-esport-ink: "#676079"
  art-digital-marketing: "#dde9e8"
  art-digital-marketing-ink: "#477577"
  art-innovation: "#eae1d9"
  art-innovation-ink: "#8a6551"
  art-international: "#e1e7ee"
  art-international-ink: "#4f7087"
  art-logistics: "#e9e8d4"
  art-logistics-ink: "#7a7846"
  art-finance: "#e4e7dc"
  art-finance-ink: "#64734e"
typography:
  display:
    fontFamily: '"Space Grotesk", "Noto Sans Thai", sans-serif'
    fontSize: "65px"
    fontWeight: 500
    lineHeight: 0.99
    letterSpacing: "-0.04em"
  headline:
    fontFamily: '"Space Grotesk", "Noto Sans Thai", sans-serif'
    fontSize: "30px"
    fontWeight: 600
    lineHeight: 1.35
    letterSpacing: "-0.025em"
  title:
    fontFamily: '"Space Grotesk", "Noto Sans Thai", sans-serif'
    fontSize: "23px"
    fontWeight: 600
    lineHeight: 1.35
    letterSpacing: "-0.025em"
  body:
    fontFamily: '"Space Grotesk", "Noto Sans Thai", sans-serif'
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: '"Space Grotesk", "Noto Sans Thai", sans-serif'
    fontSize: "12px"
    fontWeight: 600
    lineHeight: 1.5
rounded:
  badge: "4px"
  control: "7px"
  field: "8px"
  option: "9px"
  strip: "10px"
  panel: "11px"
  card: "12px"
  dialog: "13px"
  hero: "14px"
  circle: "50%"
spacing:
  compact: "6px"
  small: "12px"
  grid: "16px"
  medium: "20px"
  panel: "24px"
  roomy: "28px"
  section: "30px"
  wide: "38px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.white}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "12px 20px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  button-gold:
    backgroundColor: "{colors.gold}"
    textColor: "{colors.navy-deep}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "12px 20px"
  button-gold-hover:
    backgroundColor: "{colors.gold-hover}"
  button-secondary:
    backgroundColor: "{colors.secondary-bg}"
    textColor: "{colors.secondary-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "12px 20px"
  input:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.field}"
    padding: "10px 13px"
    width: "100%"
  department-card:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
  question-panel:
    backgroundColor: "{colors.white}"
    rounded: "{rounded.card}"
    padding: "28px"
  mission-target:
    backgroundColor: "{colors.target-surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.panel}"
    padding: "25px"
  answer-selected:
    backgroundColor: "{colors.selected-surface}"
    rounded: "{rounded.option}"
    padding: "17px 14px"
  status-live:
    backgroundColor: "{colors.live-surface}"
    textColor: "{colors.live-ink}"
    rounded: "{rounded.badge}"
    padding: "4px 7px"
---

# Design System: Businessverse Academic Week

## Overview

**Creative North Star: "The Academic Exhibition Guide"**

Cream paper, deep marine wayfinding and warm UBS gold make the business challenge feel like a coherent university exhibition. Precise circular diagrams, numbered disciplines and passport stamps connect eight areas of study without requiring decorative scenery. The supplied UTCC Business School logo anchors the identity.

The interface serves participants making decisions on phones and organizers operating controls on desktops and a stage display. Keep the working surfaces calm, the next action explicit and progress visible. The source implementation is the authority when older screenshots differ.

**Key Characteristics:**

- Marine navigation and large compact display typography.
- Cream page canvas with white operational panels and muted discipline illustrations.
- A connected eight-node business diagram and circular completion stamps.
- Thai-first content with an English interface toggle.
- Visible objectives, business state and decision progress across qualifier questions and the integrated Final plan.

Evidence: `apps/web/src/styles.css`, the direction contract in `apps/web/src/App.tsx`, `Shell`, `Hub`, `Quiz`, `Final`, `Admin`, and `main.tsx`. Direction provenance is in `docs/design-direction.md`; product constraints are in `PRODUCT.md`. The four supplied captures in `docs/screenshots/` were inspected: desktop/mobile predate final semantic-label and decision-context changes; admin/presentation show no players. No computed contrast measurement or pixel-fidelity certification is implied by this record.

## Colors

The palette combines marine structure, warm paper and gold emphasis; subdued botanical, mineral and sand tones distinguish disciplines. Sidecar tonal ramps are synthesized OKLCH preview extensions, not additional application tokens or approved contrast pairings.

### Primary

- **Marine Ink** (`ink`): body text, sidebar, hero and standard primary actions. The CSS aliases `--ink` and `--navy` share this value.
- **Deep Marine** (`navy-deep`): stage presentation canvas and dark text on gold actions.
- **UBS Gold** (`gold`): brand symbol, business wordmark emphasis, entry action, completion numerals and first-place presentation card.
- **Action hover tones** (`primary-hover`, `gold-hover`): the corresponding enabled button states.

### Secondary

- **Sage Control** (`secondary-bg`, `secondary-ink`): secondary actions.
- **Objective Sage** (`target-surface`): persistent target context.
- **Selection Sage** (`selected-surface`, `selected-border`): chosen answer surface and stroke.
- **Live Green** (`live-surface`, `live-ink`): open-mission badges; labels and dots accompany the color.
- **Discipline pairs** (`art-*` and `art-*-ink`): Management sand, Marketing sage, E-Sport lavender, Digital Marketing teal, Innovation clay, International slate, Logistics straw and Finance olive. Pair each pale art surface with its matching icon ink; these are category identifiers, not correctness states.

### Neutral

- **Paper** (`paper`): the continuous application canvas.
- **White** (`white`): panels, controls and text on marine primary buttons.
- **Muted Slate** (`muted`): supporting prose.
- **Quiet Divider** (`line`): structural rules and section boundaries.
- **Field Stroke** (`input-border`): resting inputs and selects.

**The Meaning Before Color Rule.** Keep state names, counts and icons alongside color; a green tint alone does not explain progress or availability.

## Typography

**Display and body stack:** Space Grotesk, Noto Sans Thai, sans-serif. Both families are self-hosted through Fontsource imports; Space Grotesk ships weights 400–700, Noto Sans Thai 400–600. Thai glyphs use Noto Sans Thai in the shared stack. Synthetic font styling is disabled.

The display is compact and geometric; the body remains open enough for Thai scenarios. The hierarchy is role-based with local size adjustments rather than a mathematical modular scale. Frontmatter records the base roles; surface-specific applications follow below.

- **Display:** the hero role; its responsive sizes range from (59px) to (76px), with phone styling at (63px). Preserve its tight leading and restrained weight.
- **Headline:** base page heading role; the common page heading is (28px), reducing to (23px) on phones. Presentation headings use (38px), weight (400), reducing through (30px), (26px), then (22px).
- **Title:** section and panel headings use the base title role or local (18–20px) sizes. Question titles use (27px), line-height (1.2), reducing to (24px).
- **Body:** the root role is in frontmatter; paragraphs use line-height (1.8). Decision scenarios use (15px), line-height (1.9), and a maximum (65ch); phones use (14px), line-height (1.95).
- **Label:** the reusable action-label role is in frontmatter. Lower-priority metadata varies by surface; its smallest incumbent sizes are not a recommended floor for new content.
- **Numbers:** business metrics and scores use tabular numerals where specified. Rank numerals are large and light, with stronger score weight.

**The Heading First Rule.** Put the meaningful Thai discipline or objective heading before its English name or descriptive metadata, following the current component order.

## Layout

The desktop shell uses a fixed marine sidebar (226px), an offset flexible workspace, a white topbar (78px), and centered content capped at (1450px). Main content uses (36px 38px 24px) padding. Panels carry their own padding; use the extracted spacing values as observed choices, not as a rigid universal grid.

The discipline grid is four equal columns with (16px) gaps, switching to two columns at (1000px). Department cards remain two columns on phones. Quiz content is capped at (1080px); the desktop decision panel sits beside a (248px) context column with a (23px) gap. Context comes first in the DOM and occupies the right desktop column through explicit grid placement.

| Breakpoint | Implemented behavior |
| --- | --- |
| At least 1550px | More spacious hero/content, larger display type and taller discipline art. |
| At most 1200px | Sidebar (205px); content gutters (26px); organizer panels stack; quiz context narrows to (210px). |
| At most 1000px | Sidebar (185px); discipline grid becomes two columns; quiz becomes one column with objective and business metrics before the question. Context uses two columns and help copy is hidden. |
| At most 760px | Sidebar and breadcrumb disappear; compact brand topbar and fixed bottom navigation appear. Content gutters are (22px); presentation finalists become two columns. |
| At most 540px | Content gutters become (18px), topbar (64px); quiz context stacks, six business metrics form three columns, and target criterion remains visible while supplemental description/bonus copy hides. Submit action spans the panel. |

Bottom navigation is (69px) high, includes safe-area inset padding and has footer clearance. Data tables scroll within their container. Long participant names wrap in presentation cards; account names truncate in the topbar.

**The Context Before Choice Rule.** Keep the current business objective, measurable target and business metrics before answer controls. Qualifier context precedes the scenario on compact screens; the Final introduces its shared crisis before company context. Refresh target context with live target changes; do not make participants leave their decision to find it.

## Elevation & Depth

Depth comes primarily from tonal layering: cream canvas, white panels, sage context and marine enclosure. Structural dividers are thin and quiet. Shadows are sparse and soft rather than the default card treatment.

- **Selected filter:** `0 2px 5px #1735400a`, under the white selected segment.
- **Department hover:** `0 9px 25px #17354010`, accompanied by a (4px) upward movement.
- **Waiting symbol:** `0 8px 25px #a88d2b0b`, a light ambient accent.
- **Dialog backdrop:** translucent marine (`#081d25bd`) isolates the native modal.

Buttons transition background and transform over (0.18s), moving up (1px) on enabled hover. Department cards transition over (0.2s); answer surfaces over (0.15s). The loading skeleton pulses over (1.8s ease-in-out). Completion scales from (0.96) to (1) via Framer Motion. `MotionConfig` respects the user's reduced-motion preference, and the reduced-motion media query disables CSS animation/transitions and smooth scrolling.

**The Tonal Depth Rule.** Use surface color and spacing before adding elevation; keep shadows tied to the existing selection, hover or waiting treatments.

## Shapes

Soft rectangles support precise circles. Use the extracted role radii: compact badges, controls and fields progress toward larger panels and the hero; avoid applying a single oversized radius to every surface. The logo's square frame and diamond accent remain deliberate exceptions.

Circular department linework, target icons, numbered steps and stamp rings form the signature geometry. Dashed rings and empty stamp outlines denote progress yet to be earned; earned stamps gain green fill and a check. Cards clip their category art within their rounded bounds. Inputs and answer choices retain a visible one-pixel stroke.

## Components

### Buttons

Compact, confident actions with an icon only when it helps the task. Standard buttons have minimum height (46px); the small variant uses (36px), (8px 12px) padding and (11px) text. Gold is the prominent entry variant; normal operational primary actions are marine. Secondary actions use sage. Disabled controls dim to opacity (0.5) and use a not-allowed cursor. Enabled hover lifts the button; keyboard focus has a visible amber ring (3px) offset by (5px).

### Inputs / Fields

White outlined fields use a minimum height (46px) and the field radius/padding in frontmatter. Focus uses a teal outline (`#32746d`, 2px), offset (2px). Auth inputs become (16px) text on phones. Keep real labels, native selects and native inputs; field styling does not replace their semantics.

### Navigation

The desktop rail uses icon-and-label links, a muted resting label, a lighter marine hover surface and a gold-tinted active state. Route links expose the active page through `NavLink`. On phones, the same destinations become evenly distributed icon-and-label bottom links; the organizer destination appears only for admins. The language toggle remains in the topbar.

### Chips / Filters / Status

Filters sit in a pale segmented tray; the selected segment is white with the selected-filter shadow, and buttons expose `aria-pressed`. Status badges combine text with a lock, check or live dot. Small badges communicate metadata; they are not a general action target. Preserve textual distinctions between waiting, live and complete.

### Cards / Containers

Discipline cards are whole-card links with a category art band, number, icon, status, meaningful heading, English name, short description and a three-step footer. The art uses concentric code-native circles. On hover the whole card lifts; focus remains visible. White operational panels use the same rounded family with denser content and no resting shadow. Progress strips and passport stamps persist completed work without exposing rankings to players.

### Decision Context / Answer Selection

Show the objective and its threshold beside the decision on desktop and above it on compact screens. Business state uses a semantic definition list, tabular numbers and capability tags. Three ordered steps distinguish current and completed questions. The scenario precedes a real fieldset of radio or checkbox inputs; the full answer surface is its label. Selection changes both border and fill and adds a check indicator. Investment choices show the total in a polite live region. After a saved answer, focus moves to the next question or completion heading.

### Integrated Plan / Shared Allocation

The Final extends the existing white decision panel rather than introducing another visual world. Its shared crisis comes first, followed by the objective, target and six current business indicators. The cream context inset uses a three-column definition list and tabular numbers; the plan remains a single column within the existing (880px) panel cap.

A sticky marine allocation strip keeps allocated, received and remaining Coins beside the completed-section count. It uses the existing strip radius, an (8px) top offset and (16px 20px) padding, reducing to (12px) on phones. Counts and an explicit over-budget message carry the state alongside color. Native fieldsets separate the eight disciplines with numbered legends; each full-width radio label shows its action, benefit, tradeoff and Coins. A single rationale field follows the complete set. The saved state replaces the controls with a quiet divided list of all eight selected actions and the shared rationale.

**The Shared Allocation Rule.** Keep the common budget and plan progress visible across a multi-part decision; show the consequences within each action label and summarize the complete saved plan.

### Organizer Panels / Stage Presentation

Gate controls use numbered rows, department names, question counts and compact primary actions. Standings use semantic tables, a scroll wrapper, tabular scores and first-four emphasis. Empty standings explicitly await participants; do not invent populated scores. Rankings remain in the organizer experience.

Presentation is a fixed, scrollable deep-marine layer. Four finalist cards form the desktop stage; first place is gold and the remaining cards are lighter marine. When no players exist, retain awaiting-player placeholders and em dashes. Entering presentation makes shell controls inert and focuses the unlock control. Unlocking opens a native `dialog` with an accessible title, keep-presenting default action and explicit confirmation; cancelling leaves the stage view active. Fullscreen failure has an expanded-window fallback.

### Shared Feedback / Accessibility

Keep the skip link, main landmark, named navigation, accessible control labels and logo alternative text. Loading exposes a status and hidden text; errors expose an alert and optional retry. Focus rings must remain visible, including the answer wrapper via `:has(input:focus-visible)` and programmatically focused question headings. These are source-evidenced affordances, not a claim that every state has passed a keyboard or contrast audit. WCAG AA is the product requirement; verify contrast for any new pairing.

## Do's and Don'ts

### Do:

- **Do** use marine for wayfinding, cream for the canvas and white for operational panels.
- **Do** preserve gold emphasis for brand, entry, completion and presentation hierarchy.
- **Do** keep Thai and English content legible within the shared self-hosted type stack.
- **Do** put objective, current business metrics and question or plan progress within the decision flow.
- **Do** pair state color with labels, icons or counts and retain native input and dialog semantics.
- **Do** preserve reduced-motion behavior, visible focus and mobile navigation clearance.

### Don't:

- **Don't** promote tiny incumbent metadata or decorative uppercase captions into a required text style.
- **Don't** replace precise SVG diagrams and the supplied logo with invented scenery or glyph icons.
- **Don't** add heavy shadows to every panel or flatten distinct category colors into status colors.
- **Don't** expose organizer rankings in participant surfaces or fabricate scores for empty states.
- **Don't** infer contrast compliance or final screenshot fidelity from this documentation.
