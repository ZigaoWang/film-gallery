/**
 * Helpers for alternate names, usable on either side of the network.
 *
 * Deliberately importing nothing. These are needed by the pickers in the
 * browser and by the search endpoint on the server, and when they lived beside
 * the database query the whole Prisma client followed them into the client
 * bundle and every page threw on load.
 */

/**
 * Alternate names worth showing beside a record, minus any that only repeat
 * what the name already says. "Kentmere 400" adds nothing next to "Kentmere Pan
 * 400"; "5219" does.
 */
export function usefulAliases(name: string, aliases: string[]): string[] {
  const haystack = name.toLowerCase().replace(/[^a-z0-9]/g, '')
  return aliases.filter(a => !haystack.includes(a.toLowerCase().replace(/[^a-z0-9]/g, '')))
}
