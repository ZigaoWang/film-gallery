/**
 * Records how many frames are on a roll, on the variant rather than the stock.
 *
 * `FilmStock.exposures` is a single string on a record that may be sold in
 * several formats at different lengths, which is why FilmVariant replaced it.
 * It is also unreachable through the research loader: `passageSupports` drops
 * words of three characters or fewer before looking for the value in a passage,
 * so "36" can never be supported by any source and every attempt to cite one is
 * refused. The count had nowhere to go, and seventeen of twenty-four stocks had
 * none recorded anywhere.
 *
 * So it goes on the variant, which is where it belongs and where the "Sold in"
 * line already reads from. The stock's own column is left exactly as it is:
 * writing both would create the second answer the variant table exists to
 * prevent, and `exposureCounts` prefers the column while the forms still write
 * it.
 *
 * The counts live in a file rather than in this one. They are catalog content,
 * and content in a script is a second copy of an editable field that goes stale
 * the first time somebody corrects it. See scripts/rewrite/README.md.
 *
 *   npx tsx scripts/backfill-variant-exposures.ts <counts.json> [--apply]
 *
 * The file is a list of { name, format, exposures, source }. `format` is a
 * FilmFormat member and defaults to MM35. `source` is recorded nowhere and is
 * there for whoever reads the file.
 */
import { readFileSync } from 'node:fs'
import { PrismaClient, type FilmFormat } from '@prisma/client'

const prisma = new PrismaClient()

interface Count {
  name: string
  exposures: number
  /** Defaults to 35mm, which is every roll in the catalog today. */
  format?: FilmFormat
  source?: string
}

async function main() {
  const [, , file, ...flags] = process.argv
  const apply = flags.includes('--apply')

  if (!file) {
    console.error('usage: tsx scripts/backfill-variant-exposures.ts <counts.json> [--apply]')
    process.exit(1)
  }

  const counts: Count[] = JSON.parse(readFileSync(file, 'utf8'))
  let written = 0
  let created = 0
  let skipped = 0

  for (const row of counts) {
    const format: FilmFormat = row.format ?? 'MM35'

    if (!Number.isInteger(row.exposures) || row.exposures <= 0) {
      console.error(`  SKIP  ${row.name}: ${row.exposures} is not a frame count`)
      skipped++
      continue
    }

    const stock = await prisma.filmStock.findFirst({ where: { name: row.name }, select: { id: true } })
    if (!stock) {
      console.error(`  SKIP  ${row.name}: no such stock`)
      skipped++
      continue
    }

    const variant = await prisma.filmVariant.findFirst({
      where: { filmStockId: stock.id, format },
      select: { id: true, exposures: true },
    })

    // Never overwrite a number somebody already recorded. This fills gaps; a
    // disagreement between a stored count and the file is a question for a
    // person, not something to settle by running a script twice.
    if (variant?.exposures != null) {
      console.log(`  keep  ${row.name.padEnd(40)} already ${variant.exposures}`)
      skipped++
      continue
    }

    if (!apply) {
      console.log(`  would ${variant ? 'set' : 'add'}  ${row.name.padEnd(40)} ${row.exposures}`)
      written++
      continue
    }

    if (variant) {
      await prisma.filmVariant.update({ where: { id: variant.id }, data: { exposures: row.exposures } })
      written++
      console.log(`  set    ${row.name.padEnd(40)} ${row.exposures}`)
    } else {
      // A stock can have no variant at all, in which case its page shows no
      // "Sold in" line even where the format is known. OptiColour 200 was one.
      await prisma.filmVariant.create({
        data: { filmStockId: stock.id, format, exposures: row.exposures },
      })
      created++
      console.log(`  added  ${row.name.padEnd(40)} ${row.exposures}`)
    }
  }

  console.log(`\n  ${written} set, ${created} created, ${skipped} left alone`)
  await prisma.$disconnect()
}

main().catch(async error => {
  console.error(error)
  await prisma.$disconnect()
  process.exit(1)
})
