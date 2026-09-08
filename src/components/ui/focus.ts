/**
 * The visible focus indicator, in one place.
 *
 * Nineteen files had already settled on a 1px brand outline with a 2px
 * offset, and the rest had not: a dozen controls suppressed the browser's own
 * ring with `outline-none` and replaced it with a background one shade lighter
 * — `neutral-800` inside a `neutral-900` popover, which is a contrast ratio of
 * 1.19:1 and is not a thing anyone can see. The menus were the worst of them,
 * because they move focus with the arrow keys and call `.focus()` to do it, so
 * that invisible tint was the only cursor the widget had.
 *
 * Brand red against every surface on the site clears 3:1, which is what WCAG
 * 1.4.11 asks of a control boundary. An outline rather than a ring because it
 * is drawn outside the layout and cannot shift anything, and because it is
 * what the majority already used.
 */
export const focusRing =
  'focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-brand'

/**
 * The same indicator drawn just inside the element instead of just outside it.
 *
 * For a full-width row in a scrolling panel — a menu item, a name in a
 * followers list, a notification. An outside offset there is clipped away by
 * the panel it sits in, so the ring appears on the top and bottom edges and
 * vanishes on the left and right.
 */
export const focusRingInset =
  'focus-visible:outline focus-visible:outline-1 focus-visible:-outline-offset-2 focus-visible:outline-brand'
