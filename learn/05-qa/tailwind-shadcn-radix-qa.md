# Tailwind CSS, shadcn/ui, Radix — Q&A Bank

Legend: 🟢 Beginner · 🟡 Intermediate · 🔴 Advanced

## Concepts

**Q:** 🟢 What is utility-first CSS?

**A:** Styling by composing small single-purpose classes (`p-4`, `flex`, `text-sm`) in markup instead of writing custom CSS classes.

**Q:** 🟢 How does Tailwind keep CSS small?

**A:** It scans source files and generates CSS only for class names it finds.

**Q:** 🟢 What does `md:hidden` mean?

**A:** Hidden from the `md` breakpoint (768px) up; visible below. Tailwind is mobile-first (`AppShell.tsx:30`).

**Q:** 🟢 What's the spacing scale?

**A:** 1 unit = 0.25rem: `p-4` = 1rem padding; `gap-3` = 0.75rem.

**Q:** 🟢 What does `sr-only` do?

**A:** Visually hides content but keeps it accessible to screen readers.

**Q:** 🟢 What does `truncate` do?

**A:** Single-line text with ellipsis overflow (`overflow-hidden text-ellipsis whitespace-nowrap`).

**Q:** 🟢 What are arbitrary values?

**A:** Bracket syntax for one-off values: `size-[18px]`, `max-h-[75vh]`, `text-[oklch(0.45_0.1_65)]`.

**Q:** 🟢 What do opacity modifiers like `bg-primary/5` do?

**A:** Apply the color at 5% opacity.

**Q:** 🟢 What is `hover:` / `focus-visible:`?

**A:** State variants applying styles on hover or keyboard focus (`focus-visible` avoids rings on mouse click).

**Q:** 🟢 What is shadcn/ui?

**A:** A collection of copy-paste React components built on Radix and Tailwind, generated into your repo (`components/ui/*`).

**Q:** 🟢 What is Radix UI?

**A:** Unstyled, accessible primitives (Dialog, DropdownMenu, Tooltip…) handling focus, keyboard and ARIA.

**Q:** 🟢 What does "headless component" mean?

**A:** Behaviour and accessibility without styles; you provide the look.

**Q:** 🟢 What is `lucide-react`?

**A:** An icon library of React SVG components; icons use `currentColor` and are tree-shakable.

**Q:** 🟡 How is Tailwind v4 configured here?

**A:** In CSS: `@import 'tailwindcss'` and `@theme inline { --color-primary: var(--primary); … }` — no JS config (`index.css:1, 42-75`).

**Q:** 🟡 What does `@theme` do?

**A:** Declares design tokens; `--color-*` tokens generate color utilities, `--radius-*` radius utilities, `--font-*` font utilities.

**Q:** 🟡 Why define colors as CSS variables in `:root`?

**A:** Components use semantic tokens (`bg-primary`), and changing a variable (e.g. for dark mode) re-themes everything at runtime (`index.css:8-40`).

**Q:** 🟡 What is OKLCH?

**A:** A perceptually uniform color space (lightness, chroma, hue) making consistent palettes and contrast easier than HSL.

**Q:** 🟡 What does `@apply` do?

**A:** Inlines utility classes into custom CSS rules (`index.css:79, 87`).

**Q:** 🟡 What does `@layer base` do?

**A:** Places rules in the base layer, lower priority than utilities, so utilities always win.

**Q:** 🟡 What is `cn()`?

**A:** `twMerge(clsx(inputs))` — joins conditional classes and resolves Tailwind conflicts so later classes win (`lib/utils.ts:4-6`).

**Q:** 🟡 What problem does tailwind-merge solve?

**A:** `class="p-6 p-0"` — CSS order, not class order, decides the winner; twMerge removes `p-6` so overrides via `className` work predictably.

**Q:** 🟡 What is class-variance-authority (cva)?

**A:** A helper to define base classes + variant maps + defaults and produce class strings: `buttonVariants({ variant: 'outline', size: 'sm' })` (`ui/button.tsx:7-29`).

**Q:** 🟡 What does `VariantProps<typeof buttonVariants>` give?

**A:** Typed `variant`/`size` props derived from the cva config.

**Q:** 🟡 What does `data-[state=open]:animate-in` do?

**A:** Applies classes when the element has `data-state="open"` — Radix sets this attribute, enabling CSS animations (`ui/dialog.tsx:19`).

**Q:** 🟡 What does `aria-invalid:border-destructive` do?

**A:** Styles inputs with `aria-invalid="true"` — accessibility state drives styling (`ui/input.tsx:14`).

**Q:** 🟡 What does `[&_svg]:size-4` mean?

**A:** An arbitrary variant targeting descendant SVGs of the element (`ui/button.tsx:8`).

**Q:** 🟡 What does `peer-disabled:` do?

**A:** Styles an element based on a sibling marked with `peer` being disabled (`ui/label.tsx:13`).

**Q:** 🟡 What is `asChild` / `Slot`?

**A:** Radix's composition: the component renders its child element, merging props and refs — `<Button asChild><Link/></Button>` (`ui/button.tsx:39`).

**Q:** 🟡 What does Radix Dialog handle for you?

**A:** Focus trap, initial focus, focus return, Esc/outside-click close, scroll lock, `role="dialog"`, `aria-modal`, labelling via Title/Description, portal rendering.

**Q:** 🟡 Why do dialogs need a `DialogTitle` even if hidden?

**A:** The accessible name for screen readers; Radix warns when missing. Hidden titles via `sr-only` (`ui/command.tsx:34`).

**Q:** 🟡 Why do overlays use portals?

**A:** To render at `document.body`, escaping parent `overflow: hidden` and z-index stacking contexts.

**Q:** 🟡 How is the mobile drawer built?

**A:** `ui/sheet.tsx` reuses Radix Dialog with a left-edge, full-height content and slide animations.

**Q:** 🟡 What is `cmdk`?

**A:** A command-palette component with fuzzy filtering and keyboard navigation, wrapped in a dialog for Ctrl+K (`ui/command.tsx`).

**Q:** 🟡 What does `tw-animate-css` provide?

**A:** Animation utilities like `animate-in`, `fade-in-0`, `zoom-in-95`, `slide-in-from-left` used by shadcn components.

**Q:** 🔴 Why can't you build class names dynamically like `bg-${color}-500`?

**A:** Tailwind finds classes by scanning source text; dynamic strings never appear, so no CSS is generated. Use full class names in maps (cva).

**Q:** 🔴 How would you add dark mode?

**A:** Define a `.dark { --background: …; --foreground: …; }` block (or `prefers-color-scheme`), toggle the class on `<html>`, and use semantic tokens everywhere (mostly already done).

**Q:** 🔴 What are the trade-offs of owning shadcn components?

**A:** Full control and no dependency lock-in, but you maintain them and must merge upstream improvements manually.

**Q:** 🔴 What's the difference between `@theme` and `@theme inline`?

**A:** `inline` makes generated utilities reference the variable's value expression directly (needed when tokens point to other variables like `var(--primary)`), avoiding resolution issues.

## Predict / find the bug

**Q:** 🟢 Predict: `cn('p-6 pt-3', 'p-5')`

**A:** `'p-5'` — tailwind-merge drops conflicting padding classes.

**Q:** 🟡 Bug: a button's icon is huge.

**A:** SVGs default to their intrinsic size; set `size-4` (the button's `[&_svg:not([class*='size-'])]:size-4` rule handles this).

**Q:** 🟡 Bug: `<button><a href>…</a></button>` nesting warning.

**A:** Invalid HTML; use `<Button asChild><Link/></Button>`.

**Q:** 🟡 Bug: a dropdown is clipped by a card with `overflow-hidden`.

**A:** Render the content in a portal (Radix does by default via `Portal`, `ui/dropdown-menu.tsx:14`).

**Q:** 🟡 Bug: a dialog without a title logs a Radix warning.

**A:** Add `DialogTitle` (visually hidden if needed).

**Q:** 🟡 Predict: `hidden md:flex lg:w-64` at 1024px.

**A:** Displayed as flex with width 16rem (`lg` = 1024px).

## Scenarios & tasks

**Q:** 🟡 Write a cva badge with `default` and `warning` variants.

**A:** `cva('inline-flex rounded-full px-2.5 text-xs', { variants: { variant: { default: 'bg-secondary', warning: 'bg-warning/20' } }, defaultVariants: { variant: 'default' } })` (`ui/badge.tsx:6-22`).

**Q:** 🟡 Make a sidebar that is hidden on phones, an icon rail on tablets, full on desktop.

**A:** `className="hidden md:flex md:w-[72px] lg:w-64"` and render compact/full navs toggled with `lg:hidden` / `hidden lg:block` (`Sidebar.tsx:58-70`).

**Q:** 🟡 Add a new semantic color "info".

**A:** Add `--info` in `:root`, map `--color-info: var(--info)` in `@theme inline`, then use `bg-info`, `text-info`.

**Q:** 🟡 Remove duplicated `selectClass` strings.

**A:** Create `ui/select.tsx` (native select wrapper with the shared classes via `cn`) or use Radix Select.

**Q:** 🟡 How would you make a responsive two-column review layout?

**A:** `grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]` with a sticky left column `lg:sticky lg:top-24` (`PrescriptionReviewPage.tsx:163-164`).

**Q:** 🟡 How do you keep a sticky header translucent with fallback?

**A:** `bg-card/85 backdrop-blur supports-[backdrop-filter]:bg-card/70` (`AppShell.tsx:27`).

**Q:** 🔴 How would you audit accessibility of these components?

**A:** axe DevTools/Lighthouse, keyboard-only walkthrough (Tab, Esc, arrow keys), screen reader test (NVDA/VoiceOver), check contrast of OKLCH tokens.

## Comparisons & interview

**Q:** 🟡 Tailwind vs CSS Modules?

**A:** Tailwind: no naming, consistent tokens, colocated; CSS Modules: scoped semantic CSS files, familiar CSS, more naming/indirection.

**Q:** 🟡 Tailwind vs CSS-in-JS?

**A:** Tailwind generates static CSS at build time (no runtime cost); CSS-in-JS can be dynamic but adds runtime and SSR complexity.

**Q:** 🟡 shadcn vs MUI?

**A:** shadcn: you own unstyled-ish Radix-based code with Tailwind; MUI: complete design system dependency with Material look and theming API.

**Q:** 🟡 Radix vs Headless UI vs React Aria?

**A:** All headless/accessible; Radix has the broadest primitives, Headless UI pairs with Tailwind Labs, React Aria offers the deepest a11y/i18n behaviour.

**Q:** 🟡 Tailwind v3 vs v4?

**A:** v4: CSS-first config (`@theme`), new faster engine, automatic content detection, Vite plugin; v3 used `tailwind.config.js` and PostCSS.

**Q:** 🟢 Where are the design tokens defined?

**A:** `frontend/src/index.css:8-75`.

**Q:** 🟡 Why is `components.json` there?

**A:** It configures the shadcn CLI (style, aliases, CSS path) for generating components.

**Q:** 🟡 What does `font-feature-settings: 'cv11', 'ss01'` do?

**A:** Enables Inter font stylistic alternates for a cleaner look (`index.css:88`).

**Q:** 🟡 Why are some colors hard-coded (`text-[oklch(0.45_0.1_65)]`)?

**A:** A darker warning text color wasn't tokenised; better to add `--warning-foreground` (`ui/badge.tsx:17`).

**Q:** 🟡 What's `shadow-xs`?

**A:** Tailwind v4's smallest shadow utility (v3's `shadow-sm` was renamed/scaled).

**Q:** 🟡 Why does `Sidebar` render two `Logo`s?

**A:** Compact logo for the tablet rail and full logo for desktop, toggled with responsive classes (`Sidebar.tsx:60-61`).

**Q:** 🔴 How does `DropdownMenuItem`'s `destructive` prop work?

**A:** The shadcn wrapper adds a custom prop and conditionally appends `text-destructive …` classes via `cn` (`ui/dropdown-menu.tsx:31-38`) — an example of extending owned components.

**Q:** 🟡 Why `displayName` on forwardRef components?

**A:** Readable names in React DevTools and warnings (`ui/button.tsx:43`).
