# ULASA Design System Tokens & Component Rules

## 1. Color Tokens — "Graphite and Mint" (Palette B)

Graphite chrome (a fixed dark nav/table-header pair that does **not** swap
with the light/dark toggle), a cool near-white workspace, and one saturated
mint reserved for the on-device signal. See `src/app/globals.css` for the
authoritative values.

### Light Theme (default)
- `--bg`: `#EFF1F3`
- `--surface`: `#FFFFFF` (card)
- `--surface-2`: `#EAEEF2` (subdued area / context chip background)
- `--border`: `#D8DDE3`
- `--border-strong`: `#C3CBD4`
- `--text`: `#0D1116`
- `--text-muted`: `#56616D`
- `--text-faint`: `#7A8794` (tertiary ink — case codes, stat lines)
- `--accent`: `#00736B` (mint-teal clinical brand primary)
- `--accent-hover`: `#005952`
- `--accent-soft`: `#E4F7F3`
- `--accent-text`: `#004F49`

### Dark Theme
- `--bg`: `#0B0F14`
- `--surface`: `#141A20`
- `--surface-2`: `#1C242C`
- `--border`: `#232B33`
- `--border-strong`: `#34404A`
- `--text`: `#F4F7F9`
- `--text-muted`: `#94A3B0`
- `--text-faint`: `#7A8794`
- `--accent`: `#2BC0AC` (saturated mint)
- `--accent-hover`: `#6FE0CE`
- `--accent-soft`: `rgba(43, 192, 172, 0.16)`
- `--accent-text`: `#6FE0CE`

### Graphite chrome (fixed, both themes)
- `--chrome-bg`: `#141A20` — top nav background
- `--chrome-text`: `#F4F7F9`, `--chrome-text-muted`: `#94A3B0`
- `--chrome-accent`: `#2BC0AC`, `--chrome-accent-soft`: `rgba(43,192,172,.16)`, `--chrome-accent-text`: `#6FE0CE`
- `--table-header-bg`: `#1F2830`, `--table-header-text`: `#A8B4C0` — samples table header row

### Language rails (EN HI KN TA TE ML)
Higher-chroma than the rest of the palette so they read on both the light
workspace and the dark chrome. One colour, three places: the samples table's
left border, the language badge, and a demonstration card's top border.
- `--lang-en`: `#2F5D8C` · `--lang-hi`: `#B2541C` · `--lang-kn`: `#4F7A2E`
- `--lang-ta`: `#A32A3C` · `--lang-te`: `#3D46A8` · `--lang-ml`: `#A02472`

### Semantic Tokens (WCAG AA Compliant)
- **On-Device / Healthy**: mint (`--chrome-accent` `#2BC0AC`, soft `--chrome-accent-soft`, text `--chrome-accent-text` `#6FE0CE`) — used only for the on-device signal, never as a generic "active" colour.
- **Warning / SHORT / Low Utterance**: amber (`--warn` `#A66100`/`#F0CE85` dark, soft `--warn-soft`, text `--warn-text`)
- **Destructive (Delete only)**: Rose/Red (`--danger` `#DC2626`/`#EF4444` dark, soft `--danger-soft`, text `--danger-text`)
- **Experimental Protocol**: Indigo (`--experimental` `#4A3E9C`/`#9A8CFF` dark, soft `--experimental-soft`, text `--experimental-text`)

Generic "active" UI state (e.g. the samples filter chip, the "All" pill) uses
`--text`/`--surface` (a dark-neutral fill), not the mint accent — Palette B
reserves mint strictly for on-device/local signalling.

---

## 2. Typography Scale

- **Page Title**: `1.5rem` / `24px` (`text-2xl`), `font-semibold` / `font-bold`, tracking `-0.02em`
- **Section Header**: `1.125rem` / `18px` (`text-lg`), `font-semibold`, tracking `-0.01em`
- **Card Title**: `0.9375rem` / `15px`, `font-semibold`
- **Metadata Label / Filter**: `0.75rem` / `12px` (`text-xs`), `font-medium`, uppercase tracking `0.05em`
- **Body & Table Cell**: `0.875rem` - `0.9375rem` / `14px - 15px`, `leading-normal` / `leading-relaxed`
- **Helper & Hint**: `0.75rem` - `0.8125rem` / `12px - 13px`, `text-muted`
- **Indic Script Line Height**: `line-height: 1.85` (`.indic`)

---

## 3. Spacing & Radius Rules

- **Spacing Scale**: 8px grid (`gap-2`, `gap-3`, `gap-4`, `p-4`, `p-6`, `space-y-4`, `space-y-6`, `space-y-8`)
- **Corner Radius**:
  - Cards & Containers: `rounded-xl` (`12px`)
  - Buttons & Inputs: `rounded-lg` (`8px`)
  - Badges & Pills: `rounded-full` (`9999px`)
- **Shadows**:
  - Cards: `shadow-sm` (`0 1px 2px 0 rgba(0, 0, 0, 0.05)`)
  - Modals / Dropdowns: `shadow-lg`
- **Hit Targets**: Minimum `40px` (prefer `44px` on mobile/touch).

---

## 4. Component Rules

- **Top Navigation**:
  - Sticky with backdrop-blur.
  - Wordmark + version badge.
  - Active nav link: filled accent-soft pill or distinct active text + background.
  - Status pill: "100% On-Device / Private" with emerald pulsing status dot.
  - Responsive: Desktop inline; mobile/tablet collapsible hamburger menu.
- **Start Sample & Import**:
  - Desktop: 3-column inline grid (`Title` | `Language` | `Context`) + right-aligned action buttons.
  - Mobile: Clean stacked inputs.
  - Format badges: `.txt`, `.cha`, `.json` as subtle inline chips.
  - Drag-and-Drop Dropzone: Visual border-dashed area for batch file drop + fallback file picker.
- **Samples Table**:
  - Shaded table header (`bg-surface-2`), stable column alignment.
  - Filter chips row above table: `All`, `Recent`, and dynamic Language chips (`English`, `Kannada`, `Hindi`, etc.).
  - Context badges: Color-coded pills (e.g. Conversation = blue, Play = purple, Story Retell = teal).
  - Utterance count pill: Clean count; `< 50` shows amber alert icon + "SHORT" badge + tooltip.
  - Row action icons: Open Studio (`Edit`), Export (`Download`), Delete (`Trash`).
  - Delete Confirmation Modal: Accessible dialog preventing accidental sample loss.
  - Empty state with clear prompt; Hydration loader with skeleton/spinner.
- **Demonstration Samples**:
  - `grid-cols-1 md:grid-cols-3 gap-4`.
  - Top-right language badge (`EN-IN`, `KN-IN`, `HI-IN`, etc.).
  - Feature tags: Mazes, Sandhi, Code-Mixing, Diglossia, Agglutination.
  - Keyboard focusable & clickable.
- **Capabilities & Privacy**:
  - Two-column card split:
    1. Automated Clinical Metrics checklist (MLU-w, NDW, TTR, MATTR, MTLD, HD-D, Intelligibility, Maze Rate, Clausal Density, Rubrics).
    2. Privacy & Local Architecture trust card (Zero server, IndexedDB audio, local sidecar fallback).
- **Footer**:
  - Refined attribution: Dr. Amoolya G & Mr. Hemaraja Nayaka.S.
