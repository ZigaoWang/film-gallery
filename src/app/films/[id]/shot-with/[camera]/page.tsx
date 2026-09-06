import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import MasonryGrid from '@/components/MasonryGrid'
import JsonLd from '@/components/JsonLd'
import type { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { lookupFilm, lookupCamera, canonicalFilmPath, canonicalCameraPath } from '@/lib/seo/resolve'
import { breadcrumbJsonLd, collectionJsonLd } from '@/lib/seo/jsonld'
import { displayName, article, gearImageAlt } from '@/lib/seo/alt'
import { SITE_URL, comboUrl } from '@/lib/seo/site'
import { FEED_FIRST_PAGE } from '@/lib/photoFeed'
import { PUBLIC_PHOTO } from '@/lib/photoVisibility'
import { hiddenPhotoFilter } from '@/lib/blocks'
import { bodyTypeLabel, bodyTypeProse } from '@/lib/cameraFields'
import { colorBalanceLabel, filmProcessLabel } from '@/lib/filmFields'
import { textLinkClass } from '@/components/ui/TextLink'
import { formatMonth } from '@/lib/formatDate'

/**
 * Film x camera combination page: /films/kodak-gold-200/shot-with/nikon-fm2
 *
 * This is the long-tail shape people actually search ("portra 400 on a canon
 * ae-1"), and it's the pattern Lomography leans on heavily. Pages only exist for
 * pairs that have real photos behind them; anything thinner 404s rather than
 * adding another near-empty URL to the index.
 *
 * It was built for the crawler and read like it: a heading, one generated
 * sentence and a grid, with nothing of either the film or the camera on it. A
 * page that exists because somebody searched for this pairing should answer
 * what they searched for, so it now shows both halves side by side with the
 * specifications that decide how the combination renders, who shot the frames
 * below, and where else to go next. Everything on it is drawn from records the
 * catalog already holds; none of it is written at the crawler.
 */

export const dynamic = 'force-dynamic'

/** Below this, the page has too little content to deserve indexing. */
const MIN_PHOTOS = 3

/** Sibling pairings offered at the foot of the page. */
const MAX_RELATED = 8

type Params = { params: Promise<{ id: string; camera: string }> }

async function load(params: Params['params']) {
  const { id, camera: cameraParam } = await params

  const [film, camera] = await Promise.all([lookupFilm(id), lookupCamera(cameraParam)])
  if (!film || !camera) return null

  // Both halves need a slug to have a stable URL. Without this the canonical
  // and the structured data were built with non-null assertions and rendered a
  // literal "null" path segment for a record the slug backfill had not reached.
  // The two pages that link here already skip an unslugged pair.
  if (!film.slug || !camera.slug) return null

  const count = await prisma.photo.count({
    where: { ...PUBLIC_PHOTO, filmStockId: film.id, cameraId: camera.id },
  })
  if (count < MIN_PHOTOS) return null

  return { film, camera, count, path: comboUrl(film.slug, camera.slug) }
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const data = await load(params)
  if (!data) return { title: 'Not Found', robots: { index: false, follow: false } }

  const { film, camera, count, path } = data
  const filmName = displayName(film) ?? film.name
  const cameraName = displayName(camera) ?? camera.name

  const title = `${filmName} shot on ${article(cameraName)} ${cameraName}`
  const description =
    `${count} sample photos of ${filmName} shot on ${article(cameraName)} ${cameraName}. See exactly how this ` +
    `film-and-camera combination renders color, grain, and contrast, from real scans uploaded by ` +
    `AvoidXray photographers, not marketing samples.`

  const canonical = `${SITE_URL}${path}`

  return {
    title,
    description,
    keywords: [
      `${filmName} ${cameraName}`,
      `${filmName} on ${cameraName}`,
      `${cameraName} ${filmName} sample photos`,
      `${filmName} sample photos`,
    ],
    openGraph: { title, description, type: 'website', url: canonical },
    twitter: { card: 'summary_large_image', title, description },
    alternates: { canonical },
  }
}

/** One half of the pairing, drawn the way the catalog draws it everywhere else. */
function GearPanel({
  href,
  eyebrow,
  name,
  imageUrl,
  imageAlt,
  specs,
  icon,
}: {
  href: string
  eyebrow: string | null
  name: string
  imageUrl: string | null
  imageAlt: string
  specs: string[]
  icon: React.ReactNode
}) {
  return (
    <Link
      href={href}
      className="group flex gap-4 border border-neutral-800 bg-gradient-to-br from-neutral-900 to-neutral-950 p-4
                 transition-colors hover:border-neutral-700
                 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2
                 focus-visible:outline-brand"
    >
      <div className="flex h-24 w-24 shrink-0 items-center justify-center bg-neutral-900/50">
        {imageUrl ? (
          <Image src={imageUrl} alt={imageAlt} width={96} height={96} className="h-full w-full object-contain" />
        ) : (
          <span className="text-neutral-700">{icon}</span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        {eyebrow && (
          <div className="mb-1 text-[11px] font-medium uppercase tracking-widest text-brand">{eyebrow}</div>
        )}
        <h2 className="mb-2 font-bold leading-tight text-white group-hover:underline underline-offset-2">
          {name}
        </h2>
        <div className="flex flex-wrap gap-1.5">
          {specs.map(s => (
            <span key={s} className="border border-neutral-700 px-2 py-0.5 text-xs text-neutral-300">
              {s}
            </span>
          ))}
        </div>
      </div>
    </Link>
  )
}

const FilmIcon = (
  <svg className="h-10 w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
  </svg>
)

const CameraIcon = (
  <svg className="h-10 w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
)

/** A row of sibling pairings, which is real navigation rather than a footer of links. */
function RelatedPairs({
  heading,
  items,
}: {
  heading: string
  items: Array<{ href: string; label: string; count: number }>
}) {
  if (items.length === 0) return null
  return (
    <section className="mb-10">
      <h2 className="mb-4 text-lg font-bold text-white">{heading}</h2>
      <div className="flex flex-wrap gap-2">
        {items.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className="border border-neutral-800 px-3 py-1.5 text-sm text-neutral-300 transition-colors
                       hover:border-brand hover:text-white"
          >
            {item.label} <span className="text-neutral-600">({item.count})</span>
          </Link>
        ))}
      </div>
    </section>
  )
}

export default async function ComboPage({ params }: Params) {
  const data = await load(params)
  if (!data) notFound()

  const { film, camera, count, path } = data
  const session = await getServerSession(authOptions)
  const userId = (session?.user as { id?: string } | undefined)?.id

  // Blocked in either direction, matching what /api/photos applies to every
  // page after the first.
  const hidden = await hiddenPhotoFilter(userId)
  const scope = { ...PUBLIC_PHOTO, ...hidden, filmStockId: film.id, cameraId: camera.id }

  // load() runs without a session — it feeds generateMetadata and the
  // MIN_PHOTOS gate, so its count is the public total. Only recount when this
  // particular viewer actually hides somebody.
  const visibleCount =
    Object.keys(hidden).length === 0 ? count : await prisma.photo.count({ where: scope })

  const [photos, contributors, oldest, otherCameras, otherFilms] = await Promise.all([
    // Only the first screen; MasonryGrid pages the rest through /api/photos.
    prisma.photo.findMany({
      where: scope,
      take: FEED_FIRST_PAGE + 1,
      select: {
        id: true,
        thumbnailPath: true,
        mediumPath: true,
        width: true,
        height: true,
        blurHash: true,
        caption: true,
        takenDate: true,
        user: { select: { name: true, username: true } },
        _count: { select: { likes: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    // How many people, not which: the grid already credits each frame, and a
    // count is what says whether this is one person's roll or a consensus.
    prisma.photo.groupBy({ by: ['userId'], where: scope }),
    prisma.photo.findFirst({
      where: scope,
      orderBy: { createdAt: 'asc' },
      select: { createdAt: true },
    }),
    // The same pairing seen from the other side. These are the two questions
    // somebody on this page asks next, and both were dead ends before.
    prisma.photo.groupBy({
      by: ['cameraId'],
      where: { ...PUBLIC_PHOTO, ...hidden, filmStockId: film.id, cameraId: { not: camera.id } },
      _count: { _all: true },
      orderBy: { _count: { cameraId: 'desc' } },
      take: MAX_RELATED,
    }),
    prisma.photo.groupBy({
      by: ['filmStockId'],
      where: { ...PUBLIC_PHOTO, ...hidden, cameraId: camera.id, filmStockId: { not: film.id } },
      _count: { _all: true },
      orderBy: { _count: { filmStockId: 'desc' } },
      take: MAX_RELATED,
    }),
  ])

  const [relatedCameras, relatedFilms, userLikes] = await Promise.all([
    prisma.camera.findMany({
      where: { id: { in: otherCameras.map(c => c.cameraId!).filter(Boolean) } },
      select: { id: true, name: true, brand: true, slug: true },
    }),
    prisma.filmStock.findMany({
      where: { id: { in: otherFilms.map(f => f.filmStockId!).filter(Boolean) } },
      select: { id: true, name: true, brand: true, manufacturer: true, slug: true },
    }),
    userId && photos.length > 0
      ? prisma.like.findMany({
          where: { userId, photoId: { in: photos.map(p => p.id) } },
          select: { photoId: true },
        })
      : Promise.resolve([]),
  ])

  const likedIds = new Set(userLikes.map(l => l.photoId))

  const filmName = displayName(film) ?? film.name
  const cameraName = displayName(camera) ?? camera.name

  const hasMore = photos.length > FEED_FIRST_PAGE
  const gridPhotos = (hasMore ? photos.slice(0, FEED_FIRST_PAGE) : photos).map((p) => ({
    ...p,
    filmStock: { name: film.name, brand: film.brand },
    camera: { name: camera.name, brand: camera.brand },
    liked: likedIds.has(p.id),
  }))

  const filmSpecs = [
    film.iso ? `ISO ${film.iso}` : null,
    filmProcessLabel(film.process),
    colorBalanceLabel(film.colorBalance),
    film.format[0] ?? null,
  ].filter((s): s is string => Boolean(s))

  const cameraSpecs = [
    bodyTypeLabel(camera.bodyType),
    camera.format,
    camera.mountType,
    camera.year ? String(camera.year) : null,
  ].filter((s): s is string => Boolean(s))

  // A film stock's own record carries the maker; a camera's carries the brand.
  const cameraById = new Map(relatedCameras.map(c => [c.id, c]))
  const filmById = new Map(relatedFilms.map(f => [f.id, f]))

  const otherCameraLinks = otherCameras
    .map(row => {
      const c = row.cameraId ? cameraById.get(row.cameraId) : null
      if (!c?.slug || !film.slug) return null
      return { href: comboUrl(film.slug, c.slug), label: displayName(c) ?? c.name, count: row._count._all }
    })
    .filter((x): x is { href: string; label: string; count: number } => x !== null)

  const otherFilmLinks = otherFilms
    .map(row => {
      const f = row.filmStockId ? filmById.get(row.filmStockId) : null
      if (!f?.slug || !camera.slug) return null
      return { href: comboUrl(f.slug, camera.slug), label: displayName(f) ?? f.name, count: row._count._all }
    })
    .filter((x): x is { href: string; label: string; count: number } => x !== null)

  const photographerCount = contributors.length

  return (
    <div className="min-h-dvh bg-[#0a0a0a] flex flex-col">
      <JsonLd
        data={[
          breadcrumbJsonLd([
            { name: 'Home', path: '/' },
            { name: 'Film Stocks', path: '/films' },
            { name: filmName, path: canonicalFilmPath(film) },
            { name: `Shot with ${cameraName}`, path },
          ]),
          collectionJsonLd({
            name: `${filmName} shot on ${article(cameraName)} ${cameraName}`,
            description: `${count} film photographs shot on ${filmName} with ${article(cameraName)} ${cameraName}.`,
            path,
            photos: gridPhotos,
            totalPhotos: count,
          }),
        ]}
      />
      <Header />

      <main className="flex-1 max-w-7xl mx-auto w-full py-8 md:py-16 px-4 md:px-6">
        <nav aria-label="Breadcrumb" className="text-sm mb-6">
          <ol className="flex flex-wrap items-center gap-2 text-neutral-500">
            <li><Link href="/" className="hover:text-white">Home</Link></li>
            <li aria-hidden>/</li>
            <li><Link href="/films" className="hover:text-white">Film Stocks</Link></li>
            <li aria-hidden>/</li>
            <li><Link href={canonicalFilmPath(film)} className="hover:text-white">{filmName}</Link></li>
            <li aria-hidden>/</li>
            <li aria-current="page" className="text-neutral-300">{cameraName}</li>
          </ol>
        </nav>

        <header className="mb-8">
          <h1 className="mb-3 text-3xl font-black tracking-tight text-white md:text-4xl">
            {filmName} shot on {article(cameraName)} {cameraName}
          </h1>
          <p className="max-w-3xl leading-relaxed text-neutral-400">
            {visibleCount} {visibleCount === 1 ? 'photograph' : 'photographs'} from{' '}
            {photographerCount === 1 ? 'one photographer' : `${photographerCount} photographers`}
            {oldest ? `, the earliest posted ${formatMonth(oldest.createdAt)}` : ''}. Scans as they were
            uploaded, not manufacturer samples.
          </p>
        </header>

        {/* Both halves, each linking to its own page. The pairing is the
            subject of this page and neither of them was on it. */}
        <div className="mb-10 grid gap-4 md:grid-cols-2">
          <GearPanel
            href={canonicalFilmPath(film)}
            eyebrow={film.manufacturer || film.brand}
            name={film.name}
            imageUrl={film.imageStatus === 'approved' ? film.imageUrl : null}
            imageAlt={gearImageAlt(film, 'film')}
            specs={filmSpecs}
            icon={FilmIcon}
          />
          <GearPanel
            href={canonicalCameraPath(camera)}
            eyebrow={camera.brand}
            name={camera.name}
            imageUrl={camera.imageStatus === 'approved' ? camera.imageUrl : null}
            imageAlt={gearImageAlt(camera, 'camera')}
            specs={cameraSpecs}
            icon={CameraIcon}
          />
        </div>

        {/* What the pairing is, in the site's voice, from the two records. Only
            what they actually state: a stock with no process and a body with no
            type produce a shorter sentence rather than a padded one. */}
        {(film.summary || camera.bodyType) && (
          <div className="mb-10 max-w-3xl space-y-3 text-sm leading-relaxed text-neutral-400">
            {film.summary && <p>{film.summary}</p>}
            {camera.bodyType && (
              <p>
                Shot here on {bodyTypeProse(camera.bodyType)}
                {camera.format ? ` in ${camera.format}` : ''}
                {camera.year ? `, introduced in ${camera.year}` : ''}.{' '}
                <Link href={canonicalCameraPath(camera)} className={textLinkClass}>
                  More about the {camera.name}
                </Link>
              </p>
            )}
          </div>
        )}

        <div>
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white">Photos</h2>
            <span className="text-sm text-neutral-500">
              {visibleCount} {visibleCount === 1 ? 'photo' : 'photos'}
            </span>
          </div>

          <MasonryGrid
            initialPhotos={gridPhotos}
            initialOffset={hasMore ? FEED_FIRST_PAGE : null}
            tab="recent"
            scopeQuery={`&filmStockId=${film.id}&cameraId=${camera.id}`}
          />
        </div>

        <div className="mt-12">
          <RelatedPairs heading={`${filmName} on other cameras`} items={otherCameraLinks} />
          <RelatedPairs heading={`Other film in the ${camera.name}`} items={otherFilmLinks} />
        </div>
      </main>

      <Footer />
    </div>
  )
}
