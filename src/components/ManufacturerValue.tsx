import { manufacturerDisplay, type ManufacturerInput } from '@/lib/manufacturer'

/**
 * A film's manufacturer, wherever it appears.
 *
 * One component so the film page, the search results and the admin table cannot
 * word this differently. The distinction it carries is the point of the field,
 * and a catalog that phrases the same claim three ways has undermined it.
 */
export default function ManufacturerValue({
  size = 'base',
  ...input
}: ManufacturerInput & {
  size?: 'base' | 'small'
}) {
  const { value, qualifier, unconfirmed } = manufacturerDisplay(input)
  const text = size === 'small' ? 'text-xs' : 'text-sm'

  return (
    <span className={text}>
      {/* Muted when it is a conclusion rather than a company, so the eye reads
          it as an absence without the words having to say so twice. */}
      <span className={unconfirmed ? 'text-neutral-500' : 'text-neutral-200'}>{value}</span>

      {qualifier && <span className="text-neutral-500"> ({qualifier})</span>}
    </span>
  )
}
