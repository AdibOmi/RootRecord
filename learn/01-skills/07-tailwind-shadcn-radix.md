# 07 — Tailwind CSS 4, shadcn/ui, Radix UI (and cva/clsx/tailwind-merge)

> **Where it lives:** `frontend/src/index.css` (theme), `frontend/vite.config.ts:3,8` (plugin),
> `frontend/components.json` (shadcn config), `frontend/src/components/ui/*` (components),
> `frontend/src/lib/utils.ts:4-6` (`cn`).

---

## 1. What & why

**CSS** — the language that styles HTML (colors, layout, spacing). **Tailwind CSS** — a
*utility-first* CSS framework: instead of writing `.card { padding: 1rem }`, you compose small
single-purpose classes in markup: `class="p-4 rounded-xl border"`. A compiler scans your files and
generates only the classes you use.

**Radix UI** — *headless* (unstyled) React primitives that implement hard accessibility behaviour:
focus trapping, keyboard navigation, ARIA attributes, portals (Dialog, DropdownMenu, Tooltip…).

**shadcn/ui** — not a package but a **collection of copy-paste components** (Radix + Tailwind)
that a CLI writes *into your repo* (`components/ui/`), so you own and edit the code.

**Analogy:** Radix is the engine and steering (behaviour), Tailwind is the paint shop, shadcn is a
set of pre-assembled car bodies you can modify because they're parked in your garage.

**When NOT to use Tailwind:** teams that strongly prefer semantic CSS / CSS Modules, or when a
complete design-system library (MUI, Chakra) already fits.

---

## 2. Fundamentals

### 2.1 Utilities

| Class | CSS |
|---|---|
| `p-4`, `px-3`, `mt-6` | padding / margin (spacing scale: 1 = 0.25rem) |
| `flex`, `grid`, `gap-4`, `items-center`, `justify-between` | layout |
| `w-full`, `max-w-md`, `size-9` (w+h) | sizing |
| `text-sm`, `font-medium`, `truncate` | typography |
| `bg-primary`, `text-muted-foreground`, `border` | theme colors |
| `rounded-lg`, `shadow-sm` | shape |
| `hidden`, `sr-only` | visibility (`sr-only` = visible to screen readers only) |

### 2.2 Variants (prefixes)

| Prefix | Meaning | 📍 Example |
|---|---|---|
| `sm: md: lg: xl:` | min-width breakpoints (mobile-first) | `AppShell.tsx:30` `md:hidden` (menu button only on phones) |
| `hover: focus-visible: disabled:` | states | `ui/button.tsx:8` |
| `aria-invalid:` | when `aria-invalid="true"` | `ui/input.tsx:14` |
| `data-[state=open]:` | when a `data-state` attribute matches (Radix sets it) | `ui/dialog.tsx:19` |
| `supports-[backdrop-filter]:` | CSS `@supports` | `AppShell.tsx:27` |
| `[&_svg]:size-4` | arbitrary selector: style descendant SVGs | `ui/button.tsx:8` |
| `peer-disabled:` | style based on a sibling with class `peer` | `ui/label.tsx:13` |

**Mobile-first** — unprefixed classes apply to all sizes; `md:` overrides from 768px up.
📍 `Sidebar.tsx:58` `hidden … md:flex md:w-[72px] lg:w-64`: no sidebar on phones, icon rail on
tablets, full sidebar on desktops.

### 2.3 Arbitrary values

`size-[18px]`, `max-h-[75vh]`, `text-[oklch(0.45_0.1_65)]` (underscores = spaces).
📍 `LoginPage.tsx:48` gradient with three `oklch` stops.

---

## 3. Intermediate

### 3.1 Tailwind v4 configuration lives in CSS

📍 `frontend/src/index.css:1-2, 8-40, 42-75`:

```css
@import 'tailwindcss';          /* v4: one import replaces @tailwind base/components/utilities */
@import 'tw-animate-css';       /* animate-in/out utilities used by dialogs */

:root {
  --radius: 0.75rem;
  --primary: oklch(0.58 0.105 182);        /* teal */
  --muted-foreground: oklch(0.52 0.02 220);
  /* … */
}

@theme inline {
  --font-sans: 'Inter', ui-sans-serif, system-ui, …;
  --radius-lg: var(--radius);
  --color-primary: var(--primary);          /* creates bg-primary, text-primary, border-primary… */
  --color-muted-foreground: var(--muted-foreground);
  /* … */
}

@layer base {
  * { @apply border-border outline-ring/50; }
  body { @apply bg-background text-foreground antialiased; }
}
```

- **CSS custom properties** (`--name`) — variables in CSS; can be changed at runtime (dark mode).
- `@theme` — Tailwind v4's way to declare **design tokens**; `--color-*` tokens generate color
  utilities. `inline` makes utilities reference the variable directly.
- **OKLCH** — a perceptually uniform color space (lightness, chroma, hue): equal lightness steps
  *look* equal, which makes consistent palettes easier than HSL.
- `@apply` inlines utilities into custom CSS.
- There is **no `tailwind.config.js`** (`components.json:6` `"config": ""`) — v4 is CSS-first.
- Opacity modifiers: `bg-primary/5`, `bg-card/85` (`AppShell.tsx:27`).

### 3.2 The `cn()` helper

📍 `frontend/src/lib/utils.ts:4-6`:

```ts
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
```

- **clsx** — builds a class string from conditionals: `clsx('a', cond && 'b', { c: flag })`.
- **tailwind-merge** — removes conflicts so the *last* wins: `twMerge('p-6 p-0')` → `'p-0'`.
  Without it, `className="p-0"` passed to `CardContent` (default `p-6`) would be unpredictable
  (whichever rule comes later in the generated CSS wins, not the later class).

📍 `PatientDetailPage.tsx:149` `<CardContent className="p-5">` overrides the `p-6 pt-3`
default from `ui/card.tsx:29`.

### 3.3 Variants with class-variance-authority (cva)

📍 `frontend/src/components/ui/button.tsx:7-29`:

```ts
const buttonVariants = cva('inline-flex … disabled:opacity-50 …', {   // base classes
  variants: {
    variant: { default: 'bg-primary …', destructive: '…', outline: '…', ghost: 'hover:bg-muted', link: '…' },
    size: { default: 'h-10 px-4', sm: 'h-8 …', lg: 'h-11 px-6', icon: 'size-10', 'icon-sm': 'size-8' },
  },
  defaultVariants: { variant: 'default', size: 'default' },
})
```

`buttonVariants({ variant: 'outline', size: 'sm' })` returns the combined classes, and
`VariantProps<typeof buttonVariants>` types the props (`button.tsx:33`). Same in
`ui/badge.tsx:6-22`.

### 3.4 Radix primitives through shadcn wrappers

📍 `frontend/src/components/ui/dialog.tsx:31-56` wraps `DialogPrimitive.Content` in a
`Portal` + `Overlay`, adds classes, and a close button (optional via `hideClose`). Radix provides:

- Focus trap and focus return to the trigger.
- `Esc` closes; click outside closes.
- `aria-modal`, `role="dialog"`, labelled by `DialogTitle`, described by `DialogDescription`.
- `data-state="open|closed"` for animations (`data-[state=closed]:animate-out`).

📍 Accessibility requirement visible in code: Radix warns if a dialog has no title, so hidden
titles are added: `AppShell.tsx:35` `<SheetTitle className="sr-only">`, `command.tsx:34-35`.
`aria-describedby={undefined}` (`AppShell.tsx:34`) explicitly opts out of a description.

📍 `ui/sheet.tsx` reuses the Dialog primitive as a left drawer — a dialog is a dialog, whatever
it looks like.

### 3.5 `asChild` and `Slot`

📍 `ui/button.tsx:39` `const Comp = asChild ? Slot : 'button'`. `Slot` (from
`@radix-ui/react-slot`) renders its **child** element and merges props/classes/refs into it.
`<Button asChild><Link to="/scan">…</Link></Button>` produces an `<a>` with button styles — no
invalid `<button><a/></button>` nesting.

---

## 4. Advanced

### 4.1 How Tailwind generates CSS

The Vite plugin (`vite.config.ts:3,8`) scans source files for class-like strings and emits CSS
only for those. Consequence: **class names must appear literally** — `bg-${color}-500` built at
runtime will not exist. cva/variant maps work because the full strings are in the source.

### 4.2 Theming and dark mode

Because colors are CSS variables, a `.dark { --background: … }` block would theme the whole app.
Not implemented yet (single light theme).

### 4.3 Specificity and layers

`@layer base` styles have lower priority than utilities, so utilities always override base rules.

### 4.4 Icons

**lucide-react** — tree-shakable SVG icon components; `currentColor` lets icons inherit text color.
`[&_svg:not([class*='size-'])]:size-4` (`button.tsx:8`) gives icons a default size unless one is
set.

---

## 5. Comparisons

| X vs Y | Answer |
|---|---|
| Tailwind vs plain CSS / CSS Modules | colocated utilities, no naming, tiny output vs semantic classes, separate files |
| Tailwind vs CSS-in-JS (styled-components, Emotion) | build-time, zero runtime vs runtime styling (slower, SSR complexity) |
| Tailwind vs Bootstrap | primitives vs ready components with a recognisable look |
| shadcn vs MUI/Chakra/Ant | own the code (copy) vs dependency with theming API |
| Radix vs Headless UI vs React Aria | all headless; Radix broadest set; React Aria (Adobe) deepest a11y/i18n |
| v4 vs v3 | CSS-first `@theme`, new engine (faster), automatic content detection vs `tailwind.config.js` |
| `clsx` vs `twMerge` | combine vs resolve conflicts |

---

## 6. Patterns & anti-patterns

- ✅ Design tokens as CSS variables; components consume tokens (`bg-primary`) not raw colors.
- ✅ cva for variants; `cn` for overrides.
- ⚠️ Some raw colors slipped in: `text-[oklch(0.45_0.1_65)]` appears in `ui/badge.tsx:17`,
  `PrescriptionReviewPage.tsx:230, 456`. Better: a `--warning-foreground` token.
- ⚠️ `selectClass` string is duplicated in `EditPatientDialog.tsx:34-35` and
  `PrescriptionReviewPage.tsx:69-70` — extract a `ui/select.tsx` (or native-select component).
- ❌ Extremely long class strings without extraction → hard to read (some lines here are long but
  readable).

---

## 7. Security & performance

- Tailwind output contains only used classes → small CSS.
- Google Fonts are loaded from a CDN (`index.html:8-13`) — a privacy/availability dependency; a
  self-hosted font avoids third-party requests.
- Accessibility is a quality *and* legal concern; Radix covers keyboard/focus basics.

---

## 8. Cheat sheet

```
Layout: flex grid gap-4 items-center justify-between min-w-0 flex-1
Spacing: p-4 px-3 py-2 m-0 mt-6 space-y-3
Size: w-full h-10 size-9 max-w-md min-h-full
Text: text-sm font-medium text-muted-foreground truncate tracking-tight
Color: bg-card bg-primary/5 text-destructive border-input
State: hover:bg-muted focus-visible:ring-[3px] disabled:opacity-50 aria-invalid:border-destructive
Responsive: hidden md:flex lg:w-64 sm:grid-cols-2
Radix data: data-[state=open]:animate-in
cn('base', cond && 'x', className); cva(base, { variants, defaultVariants })
```

---

## 9. Why chosen + alternatives

shadcn + Radix give accessible dialogs/menus/tooltips without a heavy dependency or a generic
look; Tailwind keeps styling fast and consistent via tokens. Alternatives: MUI (more components,
heavier, "Material" look), Mantine, or CSS Modules + Radix.
