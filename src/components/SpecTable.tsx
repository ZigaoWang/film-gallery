import SourceLink from '@/components/SourceLink'
import type { SpecGroup } from '@/lib/specs'

/**
 * The specifications, as labelled rows rather than more chips.
 *
 * The strip at the top of the page answers "what is this" in five words: type,
 * format, mount, year. That is identity, and chips are right for it. The rest
 * of what a camera is runs to twenty-odd facts with units on them, and the same
 * treatment would produce a paragraph of little boxes that nobody reads and
 * nothing can be found in.
 *
 * A label and a value in two columns instead, grouped under the thing they
 * describe. Scanning for "what aperture" means running down one column, which
 * is the entire argument for a table over a pile of chips.
 *
 * Each row carries its own citation, because each row is its own claim. That
 * was already how the provenance table worked and there was nowhere to show it:
 * a page had five citable fields, so a source could only ever be attached to
 * the record in general. A weight and a maximum aperture come from different
 * pages and now say so.
 */
export default function SpecTable({
  groups,
  sourceFor,
  titleFor,
}: {
  groups: SpecGroup[]
  /** The page a field's value came from, by field name. */
  sourceFor: (field: string) => string | null
  /** The passage behind that page, shown on hover. */
  titleFor: (field: string) => string | undefined
}) {
  if (groups.length === 0) return null

  return (
    <div className="mt-8 border-t border-neutral-800 pt-6">
      <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-neutral-500">
        Specifications
      </h2>

      <div className="space-y-5">
        {groups.map(group => (
          <div key={group.title}>
            <h3 className="mb-2 text-[11px] uppercase tracking-wide text-neutral-600">
              {group.title}
            </h3>
            <dl className="divide-y divide-neutral-800/60">
              {group.rows.map(row => (
                <div key={row.field} className="flex gap-4 py-1.5 text-sm">
                  {/* Fixed-width term so the values line up into a column that
                      can be run down with the eye. */}
                  <dt className="w-36 shrink-0 text-neutral-500">{row.label}</dt>
                  <dd className="min-w-0 flex-1 text-neutral-200">
                    {row.value}
                    <SourceLink url={sourceFor(row.field)} title={titleFor(row.field)} />
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
    </div>
  )
}
