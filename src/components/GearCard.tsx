import Link from 'next/link'
import Image from 'next/image'
import { displayName, gearImageAlt, type NamedEntity } from '@/lib/seo/alt'
import { canonicalCameraPath, canonicalFilmPath } from '@/lib/seo/slug'

/**
 * A film stock or a camera, as a card that links to its page.
 *
 * The photo page drew this twice, inline and once per kind, differing only in
 * the icon and the label. The combination page then grew a third copy with its
 * own panel, its own image size and its own hover colour, which is exactly the
 * second card component four pixels off the first that makes a site feel
 * unfinished.
 *
 * One card, both kinds, everywhere the pair is shown. `specs` is optional
 * because the photo page has the specifications elsewhere on it and the
 * combination page does not.
 */

type Gear = NamedEntity & {
  id: string
  slug: string | null
  imageUrl?: string | null
  imageStatus?: string | null
}

const ICON = {
  camera: (
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
  ),
  film: (
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
  ),
}

export default function GearCard({
  kind,
  gear,
  specs = [],
}: {
  kind: 'camera' | 'film'
  gear: Gear
  /** Short facts shown as chips. Omitted where the page states them already. */
  specs?: string[]
}) {
  // Only an approved image is shown, the same rule every other surface applies.
  const image = gear.imageStatus === 'approved' ? gear.imageUrl : null
  const maker = kind === 'film' ? gear.manufacturer || gear.brand : gear.brand
  const href = kind === 'camera' ? canonicalCameraPath(gear) : canonicalFilmPath(gear)

  return (
    <Link
      href={href}
      className="group flex items-center gap-4 border border-neutral-800 bg-neutral-900 p-4
                 transition-colors hover:border-brand
                 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2
                 focus-visible:outline-brand"
    >
      <div className="relative flex h-16 w-20 shrink-0 items-center justify-center">
        {image ? (
          <Image src={image} alt={gearImageAlt(gear, kind)} fill className="object-contain" />
        ) : (
          <svg className="h-8 w-8 text-neutral-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            {ICON[kind]}
          </svg>
        )}
      </div>

      <div className="min-w-0 flex-1">
        {maker && (
          <div className="mb-1 text-xs uppercase tracking-wide text-neutral-500">{maker}</div>
        )}
        <div className="truncate font-semibold text-white transition-colors group-hover:text-brand">
          {gear.name}
        </div>
        {specs.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {specs.map(s => (
              <span key={s} className="border border-neutral-700 px-2 py-0.5 text-xs text-neutral-300">
                {s}
              </span>
            ))}
          </div>
        )}
      </div>

      <svg
        className="h-5 w-5 shrink-0 text-neutral-600 transition-colors group-hover:text-brand"
        fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </Link>
  )
}

/** The name as the card shows it, for a caller that needs the same string. */
export function gearLabel(gear: NamedEntity): string {
  return displayName(gear) ?? gear.name
}
