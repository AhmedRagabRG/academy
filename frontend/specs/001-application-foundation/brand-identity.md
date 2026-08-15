# Alsalam Academy Brand Identity

This file is the implementation reference for all future UI work.

## Palette

| Role | Value | Usage |
|---|---|---|
| Primary Navy | `#0B2A4A` | Navigation, primary actions, major headings, dominant brand field |
| Professional Blue | `#1F5A8A` | Secondary actions, active states, informational emphasis |
| Accent Gold | `#C9A34E` | Rare highlights, active indicators, focus ring, brand detail |
| Background Gray | `#F5F7FA` | Primary light application background |
| Text Dark | `#1D2939` | Primary light-mode text |

Gold is never a large background field or routine body-text color. Semantic success, warning, and
error colors remain permitted when necessary, but use restrained tones and never replace meaning
with color alone.

## Typography

Arabic uses DIN Next Arabic Bold for headings and DIN Next Arabic Regular for body text. English
uses Montserrat SemiBold and Regular. Global semantic tokens are defined in
`packages/ui/src/styles/globals.css`.

The repository does not currently contain licensed DIN Next Arabic font files. The CSS stack will
use a locally installed copy when present and otherwise falls back to an Arabic-capable sans-serif.
Licensed webfont assets may be added later without changing component code. Do not commit font
files until licensing permits repository distribution.

## Visual Rules

- Preserve RTL at the document root and use logical spacing/alignment.
- Use navy as the dominant brand color and gold as a controlled accent.
- Prefer spacious, flattened layouts; avoid unnecessary nested cards.
- Use 8–12px radii for standard surfaces; avoid pill-like containers except badges.
- Use soft navy-tinted shadows and borders rather than generic black shadows.
- Use Lucide outline icons only.
- Maintain a clear hierarchy through typography, spacing, and contrast before decoration.
- New components MUST use semantic tokens instead of introducing unrelated colors.
