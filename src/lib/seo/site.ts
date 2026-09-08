/** Canonical site-wide SEO constants. Import these instead of hardcoding URLs. */

export const SITE_URL = 'https://avoidxray.com'
export const SITE_NAME = 'AvoidXray'

/**
 * The card a page falls back to when it has no image of its own.
 *
 * `app/opengraph-image.tsx` renders one for the whole site, and a page that
 * declares nothing inherits it. A page that declares its own `openGraph`
 * block does not: the declaration replaces the inherited object, images
 * included, so every page with a hand-written openGraph and no local
 * opengraph-image file was sharing to social with no picture at all. That was
 * the home page, explore, both catalogue indexes, the pairing pages, album
 * pages, and the three static ones.
 *
 * Spell it out here rather than in nine files so the next page to declare an
 * openGraph block has something obvious to spread in.
 */
export const OG_DEFAULT_IMAGE = {
  url: `${SITE_URL}/opengraph-image`,
  width: 1200,
  height: 630,
  alt: 'AvoidXray – Film Photography Community',
} as const

export function absoluteUrl(path: string): string {
  if (!path) return SITE_URL
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`
}

export const filmUrl = (slug: string) => `/films/${slug}`
export const cameraUrl = (slug: string) => `/cameras/${slug}`
export const photoUrl = (id: string) => `/photos/${id}`
export const userUrl = (username: string) => `/${username}`
export const comboUrl = (filmSlug: string, cameraSlug: string) =>
  `/films/${filmSlug}/shot-with/${cameraSlug}`
