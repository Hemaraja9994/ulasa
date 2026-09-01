# ULASA Design System Tokens & Component Rules

## 1. Color Tokens

### Light Theme (Clinical Calm)
- `--bg`: `#F8FAFC` (Slate 50)
- `--surface`: `#FFFFFF` (Pure white card)
- `--surface-2`: `#F1F5F9` (Slate 100 table header/subdued area)
- `--border`: `#E2E8F0` (Slate 200 card/table border)
- `--border-strong`: `#CBD5E1` (Slate 300 input border)
- `--text`: `#0F172A` (Slate 900 primary ink)
- `--text-muted`: `#64748B` (Slate 500 secondary ink)
- `--accent`: `#0D9488` (Teal 600 clinical brand primary)
- `--accent-hover`: `#0F766E` (Teal 700)
- `--accent-soft`: `#CCFBF1` (Teal 100 soft badge/pill)
- `--accent-text`: `#115E59` (Teal 800 readable accent text)

### Dark Theme (Slate Obsidian)
- `--bg`: `#0B0F17` (Deep Slate Slate 950)
- `--surface`: `#131B2A` (Slate 900 elevated surface)
- `--surface-2`: `#1E293B` (Slate 800 header/subdued area)
- `--border`: `#1E293B` (Slate 800 card border)
- `--border-strong`: `#334155` (Slate 700 input border)
- `--text`: `#F8FAFC` (Slate 50 primary ink)
- `--text-muted`: `#94A3B8` (Slate 400 secondary ink)
- `--accent`: `#14B8A6` (Teal 500 clinical brand primary)
- `--accent-hover`: `#2DD4BF` (Teal 400)
- `--accent-soft`: `rgba(20, 184, 166, 0.14)` (Soft teal wash)
- `--accent-text`: `#5EEAD4` (Teal 300 readable accent text)

### Semantic Tokens (WCAG AA Compliant)
- **On-Device / Healthy**: Emerald (`#10B981`, soft: `rgba(16, 185, 129, 0.12)`, text: `#065F46` / `#34D399`)
- **Warning / SHORT / Low Utterance**: Amber (`#F59E0B`, soft: `rgba(245, 158, 11, 0.12)`, text: `#92400E` / `#FBBF24`)
- **Destructive (Delete only)**: Rose/Red (`#EF4444`, soft: `rgba(239, 68, 68, 0.12)`, text: `#991B1B` / `#F87171`)
- **Experimental Protocol**: Purple (`#8B5CF6`, soft: `rgba(139, 92, 246, 0.12)`, text: `#5B21B6` / `#C4B5FD`)

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
