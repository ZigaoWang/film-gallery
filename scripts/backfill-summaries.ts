/**
 * Backfill `summary` for every FilmStock and Camera that has a description and
 * no summary.
 *
 * The column was only ever settable from the admin table, so every entry added
 * through the site has none, and the identifying sentence people write first
 * ended up as the opening line of the description instead. The page then showed
 * no summary at all and a description leading with exactly what the summary was
 * for. The forms now derive it on write; this is the same derivation applied to
 * what is already there.
 *
 * Idempotent and additive. A row that already has a summary is left alone,
 * because a summary written to the standard is house voice and outranks
 * anything a first line implies. A description whose first line is too short to
 * be a summary is left alone too, since the column refuses it and a fragment is
 * worse than a gap.
 *
 *   npx tsx scripts/backfill-summaries.ts        # apply
 *   npx tsx scripts/backfill-summaries.ts --dry  # preview only
 */

import { PrismaClient } from '@prisma/client'
import { summaryFromDescription } from '../src/lib/catalogForm'

const prisma = new PrismaClient()
const DRY_RUN = process.argv.includes('--dry')

async function run(
  label: string,
  rows: Array<{ id: string; name: string; description: string | null }>,
  update: (id: string, summary: string) => Promise<unknown>
) {
  let filled = 0
  let skipped = 0

  for (const row of rows) {
    const summary = summaryFromDescription(row.description)
    if (!summary) {
      skipped++
      continue
    }
    console.log(`  ${row.name}\n    ${summary}`)
    if (!DRY_RUN) await update(row.id, summary)
    filled++
  }

  console.log(`${label}: ${filled} filled, ${skipped} left alone (nothing usable to derive)\n`)
  return filled
}

async function main() {
  console.log(DRY_RUN ? 'Preview only, nothing written.\n' : 'Writing.\n')

  const films = await prisma.filmStock.findMany({
    where: { summary: null, description: { not: null } },
    select: { id: true, name: true, description: true },
    orderBy: { name: 'asc' },
  })
  const cameras = await prisma.camera.findMany({
    where: { summary: null, description: { not: null } },
    select: { id: true, name: true, description: true },
    orderBy: { name: 'asc' },
  })

  console.log('Film stocks')
  const f = await run('Film stocks', films, (id, summary) =>
    prisma.filmStock.update({ where: { id }, data: { summary } }))

  console.log('Cameras')
  const c = await run('Cameras', cameras, (id, summary) =>
    prisma.camera.update({ where: { id }, data: { summary } }))

  console.log(`${f + c} summaries ${DRY_RUN ? 'would be' : ''} written.`)
  await prisma.$disconnect()
}

main().catch(async e => {
  console.error(e)
  await prisma.$disconnect()
  process.exit(1)
})
