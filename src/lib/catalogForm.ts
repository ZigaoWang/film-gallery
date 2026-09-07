/**
 * What a contributor fills in when they add or correct a catalog entry.
 *
 * One shape, used by the add dialog and the suggest-edit dialog, because they
 * ask about the same record and had drifted into asking differently. Adding a
 * camera never asked for its brand at all, so every body added through the site
 * arrived with no maker; only the edit form could supply one afterwards. The
 * two also disagreed on which fields existed, what order they came in, how the
 * preloaded film was chosen, and what the help under each one said.
 */

/** Matches the CHECK on both summary columns: null, or 20 to 200 characters. */
export const SUMMARY_MIN = 20
export const SUMMARY_MAX = 200

export type CatalogType = 'camera' | 'film'

/**
 * The values both dialogs hold.
 *
 * `maker` is one field for what the two kinds call by different names: a
 * camera's brand and a film's manufacturer are the same question, and asking
 * it the same way is most of what makes the two forms feel like one form.
 */
export interface CatalogDraft {
  name: string
  maker: string
  description: string
  /** Comma separated, as typed. */
  aliases: string

  // Camera
  bodyType: string
  /** A FrameFormat member, or empty for "not checked". */
  frameFormat: string
  /** A LensMount id, or empty. Never free text: the point of the table is that
      two people entering the same mount produce the same value. */
  mountId: string
  format: string
  /** Filled only when `format` is the literal "Other". */
  customFormat: string
  year: string
  defaultFilmStockId: string

  // Film
  iso: string
  exposures: string
  process: string
  colorBalance: string
}

export function emptyDraft(): CatalogDraft {
  return {
    name: '', maker: '', description: '', aliases: '',
    bodyType: '', frameFormat: '', mountId: '', format: '', customFormat: '', year: '', defaultFilmStockId: '',
    iso: '', exposures: '', process: '', colorBalance: '',
  }
}

/** The format actually meant, once "Other" has been resolved to what was typed. */
export function resolvedFormat(draft: CatalogDraft): string {
  return draft.format === 'Other' ? draft.customFormat.trim() : draft.format
}

/**
 * The summary a description implies, or null when it implies none.
 *
 * The summary is the identifying sentence: what search results and link
 * previews show, and what the page prints above the description. It has been
 * settable in the admin table alone, so no entry added through the site ever
 * had one, and the sentence people naturally write first ended up as the
 * opening line of the description instead. The page then showed no summary and
 * a description that led with exactly what the summary was supposed to carry.
 *
 * So it is derived rather than asked for a second time. The migration that
 * added the column anticipated this: its own note says the field should be
 * required and is not yet, because some entries have no description to derive
 * one from.
 *
 * The first line, because that is where the identifying sentence goes and it is
 * what people already write. If the line is too long to be a summary, its first
 * sentence is tried instead. Anything else answers null: under twenty
 * characters the database refuses it, and a fragment cut to fit is worse than
 * an empty field.
 */
export function summaryFromDescription(description: string | null | undefined): string | null {
  const text = (description ?? '').replace(/\r\n/g, '\n').trim()
  if (!text) return null

  const firstLine = text.split('\n')[0].trim()
  if (firstLine.length >= SUMMARY_MIN && firstLine.length <= SUMMARY_MAX) return firstLine

  if (firstLine.length > SUMMARY_MAX) {
    // A period that ends a sentence rather than an abbreviation: followed by a
    // space and a capital, or by the end of the text. "1/1200 sec." mid-line
    // does not end anything.
    const sentence = /^(.+?[.!?])(\s+[A-Z(]|$)/.exec(firstLine)?.[1]?.trim()
    if (sentence && sentence.length >= SUMMARY_MIN && sentence.length <= SUMMARY_MAX) return sentence
  }

  // Nothing usable. Cutting the line at the last word that fits was the other
  // option, and running it over the catalog is what ruled it out: it produced
  // "one of Kodak's most budget-friendly consumer-grade options alongside" and
  // stopped there. A sentence that ends mid-clause is read as the entry being
  // broken, and it would sit above the full text that says the same thing
  // properly. The field stays empty until somebody writes one.
  return null
}

/**
 * Whether a stored summary came from its description rather than from a person.
 *
 * The two fields are kept in step by rederiving one from the other, which is
 * only safe if a summary somebody wrote by hand is left alone. Nothing records
 * which is which, so this asks the question the stored values can answer: a
 * summary equal to what its own description implies was derived from it.
 *
 * Compared against the description as it is *now*. A summary that was derived
 * and has since had its description reworded no longer matches, and is
 * correctly treated as stale rather than as authored, because the caller is
 * about to replace the description anyway.
 */
export function summaryWasDerived(
  summary: string | null | undefined,
  description: string | null | undefined
): boolean {
  const stored = summary?.trim()
  if (!stored) return false
  return stored === summaryFromDescription(description)
}

/** A value a person actually supplied. */
function filled(value: string): boolean {
  return value.trim().length > 0
}

/**
 * Fields worth having that this draft has not filled, named the way the form
 * labels them.
 *
 * Shown as a nudge and never as a block. Somebody adding a camera so they can
 * tag the roll they just scanned should not be held at a form, but they are the
 * one person at that moment who knows what the thing is, and a list of what is
 * still blank is enough to get most of it. The two the schema genuinely
 * requires are validated separately and are not in here.
 */
export function worthAdding(type: CatalogType, draft: CatalogDraft): string[] {
  const missing: string[] = []

  if (!filled(draft.description)) missing.push('a description')

  if (type === 'camera') {
    if (!filled(draft.bodyType)) missing.push('body type')
    if (!filled(resolvedFormat(draft))) missing.push('format')
    // A disposable's year is rarely knowable and the form hides the field.
    if (draft.bodyType !== 'DISPOSABLE' && !filled(draft.year)) missing.push('year')
  } else {
    if (!filled(draft.iso)) missing.push('ISO')
    if (!filled(resolvedFormat(draft))) missing.push('format')
    if (!filled(draft.exposures)) missing.push('exposures')
  }

  return missing
}

/**
 * The description as paragraphs, with the summary line removed if it is still
 * the first one.
 *
 * The summary is derived from the description's opening line, so the two hold
 * the same sentence and the page was printing it twice: once as the lead and
 * again at the top of the prose below it. The writing standard's first rule
 * about these two fields is that the description never restates the summary.
 *
 * Removed at render rather than on save. Stripping it from the stored text
 * would mean the next edit derives its summary from whatever line came second,
 * so the entry would lose a sentence every time somebody corrected a typo.
 *
 * Splitting on any run of newlines rather than on a blank line only: people
 * press return once between paragraphs at least as often as twice, and the
 * blank-line rule rendered those as a single run-on block.
 */
export function descriptionParagraphs(
  description: string | null | undefined,
  summary: string | null | undefined
): string[] {
  const text = (description ?? '').replace(/\r\n/g, '\n').trim()
  if (!text) return []

  const paragraphs = text.split(/\n\s*\n|\n/).map(p => p.trim()).filter(Boolean)
  if (summary && paragraphs[0] === summary.trim()) paragraphs.shift()
  return paragraphs
}
