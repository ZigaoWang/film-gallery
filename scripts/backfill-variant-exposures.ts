/**
 * Records how many frames are on a 35mm roll, on the variant rather than the
 * stock.
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
 *   npx tsx scripts/backfill-variant-exposures.ts [--apply]
 */
import { PrismaClient, type FilmFormat } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * Frames on a 35mm roll as the maker sells it, with the page it was read from.
 *
 * Where a stock is sold in two lengths the fuller one is recorded, because the
 * variant holds one number per format. That is a loss of detail rather than an
 * error: a film listed here at 36 may also come in 24.
 *
 * Two entries are not ordinary rolls. Kodak sells no boxed Gold 800 cassette,
 * so its count is the load in a single-use body, and the same is true of the
 * Fujicolor 400 the QuickSnap carries.
 *
 * Kodak Vision3 500T is deliberately absent. Kodak sells no still cassette of
 * it, so 24, 30 and 36 are all real and the number belongs to whoever cut the
 * roll, not to the film.
 */
const COUNTS: Array<{ name: string; exposures: number; source: string }> = [
  { name: 'Ferrania P30', exposures: 36, source: 'https://analoguewonderland.co.uk/products/ferrania-p30-35mm-film-b-w-iso-80' },
  { name: 'Fujicolor 400', exposures: 27, source: 'https://asset.fujifilm.com/master/emea/files/2020-10/1da9768eb45e84422994567bfe931ef3/quicksnap_datasheet_01.pdf' },
  { name: 'Fujifilm 400', exposures: 36, source: 'https://analoguewonderland.co.uk/products/fujifilm-400-35mm-film' },
  { name: 'Fujifilm Superia Premium 400', exposures: 36, source: 'https://mall-jp.fujifilm.com/shop/c/c3045/' },
  { name: 'Harman Phoenix II 200', exposures: 36, source: 'https://www.harmanphoto.co.uk/harman-phoenix-ii-35mm' },
  { name: 'Ilford Ilfocolor 400 Plus Vintage Tone', exposures: 36, source: 'https://ilfocolor.com/product/ilford-ilfocolor-vintage-tone-400-plus-36-exp/' },
  { name: 'Ilford Ilfocolor Vivid 400', exposures: 36, source: 'https://crkphotoimaging.com.au/products/2005252/ilford-ilfocolor-400-vivid-35mm-color-film---36-exposures' },
  { name: 'Kentmere Pan 400', exposures: 36, source: 'https://analoguewonderland.co.uk/products/kentmere-pan-400-35mm-film' },
  { name: 'Kodak ColorPlus 200', exposures: 36, source: 'https://www.fotoimpex.de/shop/filme/kodak-color-plus-200-135-24.html' },
  { name: 'Kodak Gold 200', exposures: 36, source: 'https://business.kodakmoments.com/product/kodak-gold-200-film' },
  { name: 'Kodak Gold 800', exposures: 27, source: 'https://www.kodakprofessional.com/photographers/film/single-use-cameras' },
  { name: 'Kodak Portra 800', exposures: 36, source: 'https://business.kodakmoments.com/product/kodak-professional-portra-800-film' },
  { name: 'Kodak UltraMax 400', exposures: 36, source: 'https://business.kodakmoments.com/product/kodak-ultra-max-400-film' },
  { name: "LomoChrome Color '92 Sun-Kissed", exposures: 36, source: 'https://shop.lomography.com/us/lomochrome-color-92-sun-kissed-35-mm-iso-400' },
  { name: 'Lomography Color Negative 400', exposures: 36, source: 'https://shop.lomography.com/us/lomography-color-negative-35-mm-iso-400' },
  { name: 'OptiColour 200', exposures: 36, source: 'https://optikoldschool.com/' },
  { name: 'Orwo Wolfen NC400', exposures: 36, source: 'https://cdn.shopify.com/s/files/1/0549/7205/5650/files/Data_sheet_Wolfen_NC400.pdf' },
  { name: 'Yes!Star 400', exposures: 36, source: 'https://www.pandacamera.com/products/yes-star-400-36exp-135-35mm-color-negative-film' },
]

const FORMAT: FilmFormat = 'MM35'

async function main() {
  const apply = process.argv.includes('--apply')
  let written = 0
  let created = 0
  let skipped = 0

  for (const row of COUNTS) {
    const stock = await prisma.filmStock.findFirst({ where: { name: row.name }, select: { id: true } })
    if (!stock) {
      console.error(`  SKIP  ${row.name}: no such stock`)
      skipped++
      continue
    }

    const variant = await prisma.filmVariant.findFirst({
      where: { filmStockId: stock.id, format: FORMAT },
      select: { id: true, exposures: true },
    })

    // Never overwrite a number somebody already recorded. This fills gaps; a
    // disagreement between a stored count and this table is a question for a
    // person, not something to settle by running a script twice.
    if (variant?.exposures != null) {
      console.log(`  keep  ${row.name.padEnd(40)} already ${variant.exposures}`)
      skipped++
      continue
    }

    if (!apply) {
      console.log(`  would ${variant ? 'set ' : 'add '} ${row.name.padEnd(40)} ${row.exposures}`)
      written++
      continue
    }

    if (variant) {
      await prisma.filmVariant.update({ where: { id: variant.id }, data: { exposures: row.exposures } })
      written++
    } else {
      // OptiColour 200 had no variant at all, so its page showed no "Sold in"
      // line even though the format was known.
      await prisma.filmVariant.create({
        data: { filmStockId: stock.id, format: FORMAT, exposures: row.exposures },
      })
      created++
    }
    console.log(`  ${variant ? 'set' : 'added'}  ${row.name.padEnd(40)} ${row.exposures}`)
  }

  console.log(`\n  ${written} set, ${created} created, ${skipped} left alone`)
  await prisma.$disconnect()
}

main().catch(async error => {
  console.error(error)
  await prisma.$disconnect()
  process.exit(1)
})
