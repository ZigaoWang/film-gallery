import Link from 'next/link'
import Image from 'next/image'
import { blurHashToDataURL } from '@/lib/blurhash'
import type { AuthShowcase } from '@/lib/authShowcase'
import { focusRing } from '@/components/ui/focus'

/**
 * The frame around every sign-in, join and password form.
 *
 * The photographs are the argument; everything else is in the way of it. This
 * screen had accumulated three separate pitches — a subtitle under the
 * heading, a sentence laid over the collage, and a row of counted totals — and
 * three separate places to navigate from: a back link and the wordmark at the
 * top, and a strip of section links under the form. For a page whose whole job
 * is four boxes and a button, that is more furniture than form.
 *
 * What is left: the wordmark, the way back, the heading, one line saying what
 * the page is for, the form, and the photographs. The collage kept its
 * gradients only where they do work, which is the seam between the two halves.
 *
 * The form comes first in the DOM. The collage is decorative and marked as
 * such, so a screen reader lands on the heading rather than walking a dozen
 * unlabelled images to reach it.
 */
export default function AuthShell({
  title,
  subtitle,
  showcase,
  children,
  footer,
}: {
  title: string
  subtitle: string
  showcase: AuthShowcase
  children: React.ReactNode
  /** The line under the form — "No account? Create one". */
  footer?: React.ReactNode
}) {
  const { photos } = showcase
  const hasPhotos = photos.length > 0

  return (
    <div className="relative min-h-dvh bg-[#0a0a0a] lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-start">
      {/* The form side. On a phone it follows the band of photographs and is as
          tall as it needs to be; from lg it is a column that scrolls beside a
          pinned showcase. */}
      <div className="relative flex min-h-dvh flex-col px-6 pb-12 pt-8 sm:px-10 lg:px-14 lg:py-10">
        {/*
          Below lg the wordmark, the photographs and the form share one measure
          and sit centred in the viewport.

          There is a wide band — a tablet, or a small laptop window — that is
          too narrow for two columns and far too wide for a 384px form pinned
          to the left edge. It left two thirds of the screen empty beside the
          fields, with a photo strip stretched across the full width above
          them, none of it lining up with anything.
        */}
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col lg:mx-0 lg:max-w-none">
          {/*
            The wordmark on the left, where it is on every other page, and the
            way back beside it.

            A logo alone is not a control anybody is taught to press: someone who
            tapped Join from a photo and changed their mind had the browser's
            back button and nothing else, which is not there at all if they
            arrived from a link. The wordmark used to sit on the right, opposite
            the back link, which put the site's identity in the one corner of the
            page nothing else aligns to.
          */}
          <header className="flex items-center gap-5">
            <Link
              href="/"
              className={`inline-block ${focusRing}`}
              aria-label="AvoidXray home"
            >
              <Image src="/logo.svg" alt="AvoidXray" width={112} height={22} priority />
            </Link>

            <Link
              href="/explore"
              className={`-my-2 inline-flex items-center gap-1.5 py-2 text-sm text-neutral-500
                         transition-colors hover:text-white ${focusRing}`}
            >
              <svg className="h-4 w-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Browse photos
            </Link>
          </header>

          {/*
            The photographs, below lg.

            One row of whole frames rather than a fixed-height window onto a
            packed collage. That window was `26dvh`, and on a tablet — tall, and
            still one column — it cut three portraits off mid-subject and left a
            sliver of the next row showing beneath them. A row of tiles at a
            fixed ratio is never cut, because its height comes from its width.

            Full width on a phone, where edge-to-edge photographs are the
            point; aligned to the column from sm up, where a strip wider than
            the form it introduces just looks loose.
          */}
          {hasPhotos && (
            <div className="-mx-6 mt-8 grid grid-cols-3 gap-2 sm:mx-0 lg:hidden" aria-hidden>
              {photos.slice(0, 3).map(photo => (
                <div key={photo.id} className="relative aspect-[4/5] overflow-hidden bg-neutral-900">
                  <Image
                    src={photo.thumbnailPath}
                    alt=""
                    fill
                    sizes="34vw"
                    className="object-cover"
                    placeholder={photo.blurHash ? 'blur' : 'empty'}
                    blurDataURL={blurHashToDataURL(photo.blurHash)}
                  />
                </div>
              ))}
            </div>
          )}

          <main id="main-content" tabIndex={-1} className="flex flex-1 items-center py-12 outline-none">
            <div className="w-full lg:max-w-sm">
              <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">{title}</h1>
              <p className="mt-3 mb-8 text-neutral-400">{subtitle}</p>
              {children}
              {footer && <div className="mt-6 text-sm text-neutral-500">{footer}</div>}
            </div>
          </main>
        </div>
      </div>

      {/*
        The showcase, from lg.

        Pinned to the viewport and exactly as tall as it, so the collage
        overflows the bottom and is cut by the edge of the screen rather than
        running out partway down a long form. Sign-up is the tallest of these
        forms, and beside it the photographs used to stop with black underneath.
      */}
      {hasPhotos && (
        <div
          className="relative hidden border-l border-neutral-800 lg:sticky lg:top-0 lg:block lg:h-dvh lg:overflow-hidden"
          aria-hidden
        >
          <Collage photos={photos} columns={3} sizes="18vw" />

          {/* The one gradient that does work: it softens the seam where the
              collage meets the form's black column. The others existed to
              hold text that is no longer laid over the photographs. */}
          <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-[#0a0a0a] to-transparent" />
        </div>
      )}
    </div>
  )
}

/**
 * The photographs, packed shortest-column-first so the columns end level.
 *
 * Each tile keeps its own aspect ratio, so the collage reads as a contact
 * sheet rather than a grid of crops — and nothing shifts as the images arrive,
 * because the boxes are sized before they load.
 */
function Collage({
  photos,
  columns,
  sizes,
}: {
  photos: AuthShowcase['photos']
  columns: number
  sizes: string
}) {
  const cols: AuthShowcase['photos'][] = Array.from({ length: columns }, () => [])
  const heights = new Array(columns).fill(0)

  for (const photo of photos) {
    const shortest = heights.indexOf(Math.min(...heights))
    cols[shortest].push(photo)
    heights[shortest] += photo.height / photo.width
  }

  return (
    <div className="absolute inset-0 flex gap-2 p-2">
      {cols.map((col, i) => (
        <div key={i} className="flex flex-1 flex-col gap-2">
          {col.map(photo => (
            <div
              key={photo.id}
              className="relative w-full flex-shrink-0 overflow-hidden bg-neutral-900"
              style={{ aspectRatio: `${photo.width} / ${photo.height}` }}
            >
              <Image
                src={photo.thumbnailPath}
                alt=""
                fill
                sizes={sizes}
                className="object-cover"
                placeholder={photo.blurHash ? 'blur' : 'empty'}
                blurDataURL={blurHashToDataURL(photo.blurHash)}
              />
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
