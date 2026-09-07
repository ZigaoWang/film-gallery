/**
 * Reads every catalog description against the writing standard and reports what
 * does not follow it.
 *
 * The rules it can check are the mechanical ones: whether the description
 * restates the identity the summary already carries, whether it is long enough
 * to be a description at all, and whether it leans on the words the standard
 * bans. It cannot check whether a claim is true, which is the part that matters
 * most and the part only a person reading the sources can do.
 *
 * So this is a worklist, not a verdict. Every line it prints is something to go
 * and look at.
 *
 *   DATABASE_URL=<clone> npx tsx scripts/audit-catalog-prose.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * Words the standard names outright, plus the marketing register it warns
 * against. Both boundaries are anchored: without the closing one, "fun" matched
 * the FunSaver in "pre-loaded in the Kodak FunSaver", and a product name is not
 * a style problem.
 */
const MARKETING = /\b(iconic|legendary|cult classic|beloved|ultra-affordable|stunning|amazing|must-have|game-changing|revolutionary)\b/i

/**
 * A claim about everything else that was ever made.
 *
 * Reported rather than condemned: "the only remaining film in the Superia line"
 * is bounded and checkable, while "the only 35mm rangefinder capable of it" is
 * a claim about every camera there has ever been. The difference is whether
 * something narrows it, and that needs a reader.
 */
const SUPERLATIVE = /\b(the only|the first|the best|the most)\b/i

/** Attribution turns a contested claim into a checkable one about who says it. */
const ATTRIBUTED = /\b(kodak|ilford|fujifilm|canon|nikon|olympus|harman|lomography|reviewers?|labs?|the manufacturer) (says|calls|claims|describes|rates|reports|positions)\b/i

const MIN_WORDS = 15
const MAX_WORDS = 200

interface Finding { name: string; notes: string[] }

function review(name: string, summary: string | null, description: string | null): string[] {
  const text = (description ?? '').trim()
  if (!text) return ['no description']

  const notes: string[] = []
  const words = text.split(/\s+/).length
  const firstLine = text.split('\n')[0].trim().toLowerCase()

  // Leading with the name means the identifying sentence is in the description
  // rather than in the summary, which is the split the catalog is built on.
  const lead = name.split(/\s+/).slice(0, 2).join(' ').toLowerCase()
  if (firstLine.startsWith(lead) || firstLine.startsWith(`the ${lead}`)) {
    notes.push('opens by restating the name')
  }

  if (!summary) notes.push('no summary')
  if (words < MIN_WORDS) notes.push(`only ${words} words`)
  if (words > MAX_WORDS) notes.push(`${words} words, over the ${MAX_WORDS} ceiling`)

  const marketing = text.match(MARKETING)
  if (marketing) notes.push(`banned word: "${marketing[0]}"`)

  const superlative = text.match(SUPERLATIVE)
  if (superlative && !ATTRIBUTED.test(text)) {
    notes.push(`unattributed superlative: "${superlative[0]}"`)
  }

  return notes
}

async function main() {
  const [films, cameras] = await Promise.all([
    prisma.filmStock.findMany({ select: { name: true, summary: true, description: true }, orderBy: { name: 'asc' } }),
    prisma.camera.findMany({ select: { name: true, summary: true, description: true }, orderBy: { name: 'asc' } }),
  ])

  let flagged = 0
  let total = 0

  for (const [label, rows] of [['Film stocks', films], ['Cameras', cameras]] as const) {
    const found: Finding[] = []
    for (const row of rows) {
      total++
      const notes = review(row.name, row.summary, row.description)
      if (notes.length > 0) found.push({ name: row.name, notes })
    }
    flagged += found.length

    console.log(`\n${label}: ${found.length} of ${rows.length} to look at`)
    for (const f of found) console.log(`  ${f.name.padEnd(38)} ${f.notes.join('; ')}`)
  }

  console.log(`\n${flagged} of ${total} entries have something to look at.`)
  await prisma.$disconnect()
}

main().catch(async error => {
  console.error(error)
  await prisma.$disconnect()
  process.exit(1)
})
