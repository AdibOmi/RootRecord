# 27 — `components/common/*` and `components/ui/*`

## Common components (app-specific, small)

| File | Lines | What it renders | Notes |
|---|---|---|---|
| `EmptyState.tsx` | 30 | centred icon circle, title, optional description and action | composition via `action: ReactNode`; icon passed as a component (`icon: Icon`) |
| `FormField.tsx` | 33 | label (+ optional badge), the control (`children`), then error (`role="alert"`, id `${id}-error`) **or** hint | consistent spacing + a11y wiring |
| `FullPageLoader.tsx` | 13 | pulsing logo, `role="status" aria-live="polite"`, sr-only "Loading…" | used by guards and login |
| `PageHeader.tsx` | 19 | `<h1>` title, optional description, actions slot | one `h1` per page |
| `Pagination.tsx` | 43 | "Page X of Y" + Previous/Next; returns `null` when only one page | `Math.max(1, Math.ceil(total / pageSize))` |

## UI primitives (shadcn/ui, owned copies)

| File | Lines | Built on | Notes |
|---|---|---|---|
| `badge.tsx` | 32 | cva | variants default/accent/outline/muted/destructive/success/warning |
| `button.tsx` | 45 | cva + Radix `Slot` + `forwardRef` | variants, sizes, `asChild` (render as child, e.g. `Link`); icon sizing via `[&_svg]` |
| `card.tsx` | 36 | divs | `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter` |
| `command.tsx` | 112 | `cmdk` + Dialog | `Command`, `CommandDialog` (hidden title/description, `hideClose`, top-20% position), `CommandInput` (search icon), `CommandList`, `CommandEmpty`, `CommandGroup`, `CommandItem` (styled via `data-[selected=true]`) |
| `dialog.tsx` | 106 | `@radix-ui/react-dialog` | overlay with blur + fade; content centred, animated by `data-state`; optional close button with sr-only "Close" |
| `dropdown-menu.tsx` | 77 | `@radix-ui/react-dropdown-menu` | portal content with offset 6; `DropdownMenuItem` adds a `destructive` prop |
| `input.tsx` | 23 | `<input>` + `forwardRef` | focus ring, disabled, `aria-invalid:` styles |
| `label.tsx` | 21 | `@radix-ui/react-label` | `peer-disabled` styling |
| `separator.tsx` | 24 | `@radix-ui/react-separator` | decorative by default (hidden from a11y tree) |
| `sheet.tsx` | 34 | Dialog primitive | left drawer with slide animations; reuses `DialogOverlay` |
| `skeleton.tsx` | 9 | div | `animate-pulse bg-muted` placeholder |
| `sonner.tsx` | 15 | `sonner` | `Toaster` preset: top-right, rich colours, close button |
| `textarea.tsx` | 23 | `<textarea>` + `forwardRef` | same styling as Input |
| `tooltip.tsx` | 28 | `@radix-ui/react-tooltip` | portal content, dark style |

Pattern repeated in most wrappers (example `dialog.tsx:12-25`):

```tsx
const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,            // the DOM element type of the primitive
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay> // all its props except ref
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay ref={ref} className={cn('fixed inset-0 z-50 …', className)} {...props} />
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName  // nicer name in React DevTools
```

Why `forwardRef` everywhere: Radix triggers using `asChild` and form libraries need to attach refs to
the underlying DOM node. `displayName` is needed because `forwardRef` components are anonymous.

Unused exports (kept for completeness, typical of shadcn): `CardDescription`, `CardFooter`,
`DialogTrigger`, `DialogClose`, `SheetClose`, `DropdownMenuGroup`, `Separator` component (the dropdown
has its own separator), `badgeVariants`/`buttonVariants` exports.

→ Skill: `07-tailwind-shadcn-radix.md`.

## Q&A

**Q:** 🟢 What does `Button asChild` do?

**A:** Instead of rendering `<button>`, it renders its single child (e.g. `<Link>`) and merges the
button's classes/props into it via Radix `Slot` (`button.tsx:39`), so you get a link that looks like a
button with correct semantics.

**Q:** 🟡 Why do Radix dialogs need a title?

**A:** Screen readers announce dialogs by their accessible name; Radix links `DialogTitle` via
`aria-labelledby` and warns when missing. Visually hidden titles (`sr-only`) satisfy it
(`command.tsx:34`, `AppShell.tsx:35`).

**Q:** 🟡 Why does `Pagination` return `null` for a single page?

**A:** No controls are needed; returning `null` renders nothing (`Pagination.tsx:14-15`).

**Q:** 🟢 What's the purpose of `FormField`?

**A:** A consistent label + control + error/hint layout with accessible error ids, so every form looks
and behaves the same.

**Q:** 🔴 Why does shadcn copy code into your repo instead of being an npm package?

**A:** You own and can modify the components (e.g. `hideClose` in `dialog.tsx:27-29`, `destructive` in
`dropdown-menu.tsx:31`) without forking a library; the cost is that upstream fixes must be pulled in
manually.

**Q:** 🟡 What makes the dialog animate open/closed?

**A:** Radix sets `data-state="open"|"closed"`; Tailwind variants `data-[state=open]:animate-in fade-in-0
zoom-in-95` and the closed equivalents (from `tw-animate-css`) run CSS animations; Radix waits for the
exit animation before unmounting.
