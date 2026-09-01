# ULASA Engineering & UI Rules

## Clinical UI Principles
1. **Clinical Density & Trust**: Designed for Speech-Language Pathologists under clinic time pressure. Prioritize high-density scanability, stable alignments, and explicit data safety indicators over decorative animations.
2. **Local-First Safety**: Transcripts and audio remain 100% in-browser (IndexedDB/localStorage). Never add backend telemetry, cloud uploads, or hidden tracking.
3. **Design Tokens**: Always use semantic design tokens from `DESIGN.md` (`--bg`, `--surface`, `--surface-2`, `--border`, `--accent`, `--warn`, `--danger`).
4. **Spacing & Radii**: Stick strictly to the 8px spacing scale (`p-4`, `p-6`, `gap-3`, `gap-4`) and standardized radius (`rounded-xl` for cards, `rounded-lg` for inputs/buttons, `rounded-full` for badges).
5. **Accessibility**: Maintain WCAG AA contrast in both Light and Dark themes. Ensure visible `:focus-visible` outlines, accessible button labels, and keyboard navigability across tables, modals, and fixtures.
6. **Destructive Actions**: Deletion of samples or clinical data must always require explicit confirmation.
