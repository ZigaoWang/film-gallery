import type { ReactNode } from 'react'

/**
 * One specification, as the catalog prints it everywhere.
 *
 * The film page, the camera page and the gear card each carried their own copy
 * of the same class string. They agreed, which is the dangerous kind of
 * duplication: three literals that happen to match today and drift the first
 * time one of them is adjusted. Two of them had already fallen out of step on
 * the gap between chips.
 *
 * `label` is the quiet prefix the film page puts in front of a value whose
 * meaning is not obvious from the value alone, as in "Balance Daylight".
 */
export default function SpecChip({
  label,
  children,
}: {
  /** Shown before the value in a dimmer weight. Omitted where the value speaks. */
  label?: string
  children: ReactNode
}) {
  return (
    <span className="text-xs px-2 py-0.5 border border-neutral-700 text-neutral-300">
      {label && <span className="text-neutral-500">{label} </span>}
      {children}
    </span>
  )
}
