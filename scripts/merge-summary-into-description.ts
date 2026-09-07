/**
 * Folds the stored summary into the front of its description.
 *
 * The two were separate columns holding one piece of writing, and the split is
 * what caused every bug around them. The summary was derived from the
 * description once, at creation, and then the two drifted: the Konica C35 EF
 * printed its old opening sentence as the lead and the reworded one directly
 * beneath. Worse, the edit form only ever showed the description, so the
 * sentence a reader sees first was not in the box they were editing, and
 * saving derived a new summary out of whatever line happened to be first.
 *
 * One field instead. The description holds everything, its opening line is the
 * summary, and the summary is computed where it is needed rather than stored.
 * A field that is never written cannot drift from the one it was copied from.
 *
 * This is the data half: put the sentence back where it belongs so nothing is
 * lost when the column stops being read. A row whose summary is already the
 * first line is left alone.
 *
 * The acceptance check is exact, and it is the reason to trust the migration:
 * for every row, deriving a summary from the new description must return the
 * old summary character for character. Anything that fails is reported and not
 * written, because a mismatch means the page would start showing a different
 * sentence than it does today.
 *
 *   npx tsx scripts/merge-summary-into-description.ts [--apply]
 */
import { PrismaClient } from '@prisma/client'
import { summaryFromDescription } from '../src/lib/catalogForm'

const prisma = new PrismaClient()

interface Row {
  id: string
  name: string
  summary: string | null
  description: string | null
}

/** The description this row should end up with, or null if it needs no change. */
function merged(row: Row): string | null {
  const summary = row.summary?.trim()
  if (!summary) return null

  const description = (row.description ?? '').replace(/\r\n/g, '\n').trim()
  if (!description) return summary

  // Already in place. The common case for anything created through the site,
  // where the summary was derived from this very line.
  if (description.split('\n')[0].trim() === summary) return null

  return `${summary}\n\n${description}`
}

async function main() {
  const apply = process.argv.includes('--apply')

  const [films, cameras] = await Promise.all([
    prisma.filmStock.findMany({ select: { id: true, name: true, summary: true, description: true } }),
    prisma.camera.findMany({ select: { id: true, name: true, summary: true, description: true } }),
  ])

  let changed = 0
  let alreadyRight = 0
  let refused = 0

  for (const [label, rows] of [['Film stocks', films], ['Cameras', cameras]] as const) {
    console.log(`\n${label}`)
    for (const row of rows) {
      const next = merged(row)
      if (next === null) {
        alreadyRight++
        continue
      }

      // The whole point. If the new description does not imply exactly the
      // summary this row already has, folding it in would change what the page
      // says, and that is not a migration.
      const derived = summaryFromDescription(next)
      if (derived !== row.summary?.trim()) {
        console.error(`  REFUSE  ${row.name}`)
        console.error(`            stored:  ${row.summary}`)
        console.error(`            derived: ${derived}`)
        refused++
        continue
      }

      changed++
      if (!apply) {
        console.log(`  would fold  ${row.name}`)
        continue
      }

      if (label === 'Film stocks') {
        await prisma.filmStock.update({ where: { id: row.id }, data: { description: next } })
      } else {
        await prisma.camera.update({ where: { id: row.id }, data: { description: next } })
      }
      console.log(`  folded  ${row.name}`)
    }
  }

  console.log(
    `\n  ${changed} ${apply ? 'folded' : 'to fold'}, ${alreadyRight} already right, ${refused} refused`
  )
  await prisma.$disconnect()
  process.exit(refused === 0 ? 0 : 1)
}

main().catch(async error => {
  console.error(error)
  await prisma.$disconnect()
  process.exit(1)
})
