// Next treats `opengraph-image` and `twitter-image` as separate conventions, so
// without this file a tweet or a Slack unfurl reading twitter:image gets nothing.
export { default, alt, size, contentType } from './opengraph-image'

// Must be a literal — see the note in films/[id]/twitter-image.tsx.
export const revalidate = 3600
