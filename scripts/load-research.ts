/**
 * Loads returned research into the review queue.
 *
 * Takes the JSON shape described in research-brief.md, checks it hard, and
 * submits each entry as a revision. Nothing is written to a record: every
 * result lands in /admin/revisions with its citations attached and a person
 * decides. Research arriving from elsewhere is exactly the input that should
 * not be trusted straight into the catalogue.
 *
 * What it refuses, and why each one has bitten:
 *  - a claim with a source but no passage, which is how a correct citation
 *    became indistinguishable from a careless one
 *  - an enum value the column does not accept, which fails at review time with
 *    a message naming a constraint rather than the entry
 *  - a summary outside 20 to 200 characters, which the database rejects
 *  - a passage that is merely our own sentence repeated back
 *
 *   npx tsx scripts/load-research.ts results.json [--apply]
 */
import { readFileSync } from 'node:fs'
import { PrismaClient, type EntityType } from '@prisma/client'
import { submitRevision } from '../src/lib/revisions'
import { ADMIN_RESOURCES } from '../src/lib/admin/resources'

const prisma = new PrismaClient()

interface Cited {
  value: string | number
  source?: string
  passage?: string
  editorial?: true
}

interface Paragraph {
  text: string
  source?: string
  passage?: string
  editorial?: true
}

interface Result {
  name: string
  entityType: EntityType
  fields?: Record<string, Cited>
  description?: Paragraph[]
  omitted?: Record<string, string>
  notes?: string
}

/** Exactly what each column accepts. Anything else is refused here. */
const ENUMS: Record<string, readonly string[]> = {
  process: ['C41', 'E6', 'ECN2', 'BW', 'OTHER'],
  chromaticity: ['COLOR', 'MONOCHROME'],
  polarity: ['NEGATIVE', 'POSITIVE', 'DIRECT_POSITIVE'],
  colorBalance: ['DAYLIGHT', 'TUNGSTEN', 'NA'],
  manufacturerStatus: ['SAME_AS_BRAND', 'KNOWN', 'ATTRIBUTED', 'UNKNOWN'],
  bodyType: ['SLR', 'RANGEFINDER', 'COMPACT', 'TLR', 'FOLDING', 'VIEW', 'INSTANT', 'DISPOSABLE'],
  frameFormat: ['FULL_FRAME', 'HALF_FRAME', 'PANORAMIC', 'SPROCKET_HOLE'],
}

/**
 * Words that would appear in a passage genuinely stating each value.
 *
 * A citation exists so a reader can check a claim without trusting us. One
 * whose passage never mentions the value fails at that even when the value is
 * right: hovering "full frame" and reading a sentence about a zoom lens teaches
 * nothing. Such a field is refused and reported, leaving the value uncited
 * rather than wrongly cited.
 */
const SUPPORTING_WORDS: Record<string, readonly string[]> = {
  COLOR: ['color', 'colour'],
  MONOCHROME: ['black and white', 'black & white', 'monochrome', 'panchromatic', 'b&w'],
  TUNGSTEN: ['tungsten', '3200k'],
  DAYLIGHT: ['daylight', '5500k', 'luz día', 'luz dia'],
  NA: ['black and white', 'monochrome', 'panchromatic'],
  C41: ['c-41', 'c41'],
  E6: ['e-6', 'e6'],
  ECN2: ['ecn-2', 'ecn2'],
  BW: ['black and white', 'black & white', 'monochrome', 'panchromatic'],
  NEGATIVE: ['negativ'],
  POSITIVE: ['positive', 'slide', 'reversal'],
  DIRECT_POSITIVE: ['instant', 'diffusion transfer'],
  SLR: ['single-lens reflex', 'single lens reflex', ' slr', 'reflex'],
  RANGEFINDER: ['rangefinder'],
  COMPACT: ['compact', 'point-and-shoot', 'point and shoot'],
  TLR: ['twin-lens', 'twin lens', 'tlr'],
  FOLDING: ['folding'],
  VIEW: ['view camera'],
  INSTANT: ['instant'],
  DISPOSABLE: ['single-use', 'single use', 'disposable', 'one-time-use', 'one time use'],
  FULL_FRAME: ['35 mm', '35mm', '24x36', '24 x 36', 'full frame', 'full-frame', '135'],
  HALF_FRAME: ['half-frame', 'half frame'],
  PANORAMIC: ['panoram'],
  SPROCKET_HOLE: ['sprocket'],
}

/**
 * Whether the passage visibly carries the value.
 *
 * Deliberately crude. It cannot judge meaning, so it only asks whether the
 * words are there at all, and a claim it cannot see is reported rather than
 * loaded. Free text and the maker's confidence are exempt: a summary is our own
 * sentence, and no phrasing of "reported" appears in a source verbatim.
 */
function passageSupports(field: string, value: unknown, passage: string): boolean {
  if (field === 'summary' || field === 'manufacturerStatus' || field === 'manufacturedBy') return true
  const text = passage.toLowerCase()
  if (typeof value === 'number') return text.includes(String(value))
  const words = SUPPORTING_WORDS[String(value)]
  if (words) return words.some(w => text.includes(w))
  return String(value)
    .toLowerCase()
    .split(/[\s,]+/)
    .filter(w => w.length > 3)
    .some(w => text.includes(w))
}

const [, , file, ...flags] = process.argv
const apply = flags.includes('--apply')

if (!file) {
  console.error('usage: tsx scripts/load-research.ts <results.json> [--apply]')
  process.exit(1)
}

/**
 * `manufacturedBy` arrives as a brand name because a researcher cannot know our
 * ids. The column takes an id, so the name is resolved before submitting and an
 * unrecognised one is refused rather than dropped.
 */
async function resolveBrandId(name: string): Promise<string | null> {
  const brand = await prisma.brand.findFirst({
    where: { name: { equals: name, mode: 'insensitive' } },
    select: { id: true },
  })
  return brand?.id ?? null
}

function problemsWith(entry: Result): string[] {
  const problems: string[] = []
  // The allowlist every write path checks against. A field missing from it is
  // discarded at review with nothing said, which is how a whole research pass
  // could appear to load and change nothing.
  const editable = ADMIN_RESOURCES[entry.entityType === 'FILM_STOCK' ? 'films' : 'cameras'].editable

  for (const [field, cited] of Object.entries(entry.fields ?? {})) {
    // manufacturedBy is a name here and becomes manufacturedByBrandId below.
    const column = field === 'manufacturedBy' ? 'manufacturedByBrandId' : field
    if (!(column in editable)) {
      problems.push(`${field}: not a field this catalogue can write`)
      continue
    }
    if (cited.editorial) {
      problems.push(`${field}: a specification cannot be house voice`)
      continue
    }
    if (!cited.source) problems.push(`${field}: no source`)
    else if (!cited.passage) problems.push(`${field}: source with no passage`)

    const allowed = ENUMS[field]
    if (allowed && !allowed.includes(String(cited.value))) {
      problems.push(`${field}: "${cited.value}" is not one of ${allowed.join(', ')}`)
    }
  }

  for (const [i, p] of (entry.description ?? []).entries()) {
    if (p.editorial) continue
    if (!p.source) problems.push(`description paragraph ${i + 1}: no source`)
    else if (!p.passage) problems.push(`description paragraph ${i + 1}: source with no passage`)
    // A passage identical to our own sentence means nothing was read; it is
    // the site quoting itself.
    else if (p.passage.trim() === p.text.trim()) {
      problems.push(`description paragraph ${i + 1}: passage is our own sentence`)
    }
  }

  const summary = entry.fields?.summary?.value
  if (typeof summary === 'string' && (summary.length < 20 || summary.length > 200)) {
    problems.push(`summary is ${summary.length} characters, needs 20 to 200`)
  }

  return problems
}

async function findEntity(entry: Result) {
  if (entry.entityType === 'FILM_STOCK') {
    return prisma.filmStock.findFirst({ where: { name: entry.name }, select: { id: true } })
  }
  return prisma.camera.findFirst({ where: { name: entry.name }, select: { id: true } })
}

async function main() {
  const results: Result[] = JSON.parse(readFileSync(file, 'utf8'))
  let submitted = 0
  let skipped = 0

  for (const entry of results) {
    const target = await findEntity(entry)
    if (!target) {
      console.error(`  SKIP  ${entry.name}: no such record`)
      skipped++
      continue
    }

    const problems = problemsWith(entry)
    if (problems.length > 0) {
      console.error(`  SKIP  ${entry.name}`)
      for (const p of problems) console.error(`          ${p}`)
      skipped++
      continue
    }

    const payload: Record<string, unknown> = {}
    const sourceUrls: Record<string, Array<{ claim: string; passage?: string; url?: string; editorial?: true }>> = {}

    let unresolved: string | null = null
    const unsupported: string[] = []
    for (const [field, cited] of Object.entries(entry.fields ?? {})) {
      let column = field
      let value: unknown = cited.value

      if (field === 'manufacturedBy') {
        const id = await resolveBrandId(String(cited.value))
        if (!id) { unresolved = String(cited.value); break }
        column = 'manufacturedByBrandId'
        value = id
      }

      if (!passageSupports(field, cited.value, cited.passage ?? '')) {
        unsupported.push(`${field} = ${cited.value}`)
        continue
      }

      payload[column] = value
      sourceUrls[column] = [
        { claim: String(cited.value).slice(0, 60), passage: cited.passage, url: cited.source },
      ]
    }

    if (unresolved) {
      console.error(`  SKIP  ${entry.name}: no brand named "${unresolved}"`)
      skipped++
      continue
    }

    if (entry.description?.length) {
      payload.description = entry.description.map(p => p.text).join('\n\n')
      sourceUrls.description = entry.description.map(p =>
        p.editorial
          ? { claim: p.text.slice(0, 60), editorial: true as const }
          : { claim: p.text.slice(0, 60), passage: p.passage, url: p.source }
      )
    }

    for (const u of unsupported) {
      console.error(`  DROP  ${entry.name}: ${u} — the passage does not state it`)
    }

    if (Object.keys(payload).length === 0) {
      console.error(`  SKIP  ${entry.name}: nothing to propose`)
      skipped++
      continue
    }

    if (!apply) {
      console.log(`  would submit  ${entry.name}  (${Object.keys(payload).join(', ')})`)
      submitted++
      continue
    }

    await submitRevision({
      entityType: entry.entityType,
      entityId: target.id,
      payload,
      sourceUrls: sourceUrls as unknown as Record<string, string>,
      source: 'RESEARCH',
      submittedById: null,
    })
    console.log(`  submitted  ${entry.name}  (${Object.keys(payload).join(', ')})`)
    submitted++
  }

  console.log(`\n  ${submitted} ${apply ? 'submitted' : 'ready'}, ${skipped} skipped`)
  console.log(apply ? '  Review them at /admin/revisions.' : '  Re-run with --apply to submit.')
  await prisma.$disconnect()
}

main()
