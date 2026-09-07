/**
 * Moves specifications out of the prose and into the columns that now hold them.
 *
 * Every focal length, aperture and weight in this catalog was written into a
 * description, because until now there was nowhere else to put one. The fields
 * exist now, so the same facts go where they can be sorted, compared and cited
 * one at a time.
 *
 * The rule is the one revoice-pass.ts follows, and it is what makes this safe
 * to run without a citation per value: an entry here may only restate something
 * the description already asserts. Nothing new is introduced. A fact the prose
 * does not contain does not belong in this file; it belongs in a research pass
 * with a source under it.
 *
 * Applied as an admin edit, so each one still becomes a Revision and is still
 * reviewable afterwards. Values are checked against the same coercion the admin
 * form uses, so a bad enum or an out-of-range number is refused here rather
 * than reaching the column.
 *
 *   npx tsx scripts/load-specs.ts <specs.json> [--apply]
 */
import { readFileSync } from 'node:fs'
import { PrismaClient, type EntityType } from '@prisma/client'
import { applyAdminEdit } from '../src/lib/revisions'

const prisma = new PrismaClient()

interface Entry {
  entityType: EntityType
  /** Matched by name, because ids are not readable in a content file. */
  name: string
  fields: Record<string, string | number | boolean | string[]>
}

async function findEntity(entry: Entry) {
  if (entry.entityType === 'FILM_STOCK') {
    return prisma.filmStock.findFirst({ where: { name: entry.name }, select: { id: true } })
  }
  return prisma.camera.findFirst({ where: { name: entry.name }, select: { id: true } })
}

async function main() {
  const [, , file, ...flags] = process.argv
  const apply = flags.includes('--apply')

  if (!file) {
    console.error('usage: tsx scripts/load-specs.ts <specs.json> [--apply]')
    process.exit(1)
  }

  const batch: Entry[] = JSON.parse(readFileSync(file, 'utf8'))
  const admin = await prisma.user.findFirstOrThrow({ where: { isAdmin: true }, select: { id: true } })

  let done = 0
  let skipped = 0
  let refusedFields = 0

  for (const entry of batch) {
    const target = await findEntity(entry)
    if (!target) {
      console.error(`  SKIP  ${entry.name}: no such record`)
      skipped++
      continue
    }

    const fields = Object.keys(entry.fields)
    if (fields.length === 0) {
      skipped++
      continue
    }

    if (!apply) {
      console.log(`  would set  ${entry.name.padEnd(34)} ${fields.join(', ')}`)
      done++
      continue
    }

    const result = await applyAdminEdit(entry.entityType, target.id, entry.fields, admin.id)
    if ('error' in result) {
      console.error(`  FAIL  ${entry.name}: ${result.error}`)
      skipped++
      continue
    }

    // A field the pipeline refused is reported rather than swallowed. Silently
    // dropping one is how a value can be written, appear to save, and not be
    // there afterwards.
    if (result.rejected.length > 0) {
      console.error(`  PART  ${entry.name}: refused ${result.rejected.join(', ')}`)
      refusedFields += result.rejected.length
    }
    console.log(`  set   ${entry.name.padEnd(34)} ${result.applied.length} fields`)
    done++
  }

  console.log(`\n  ${done} ${apply ? 'written' : 'ready'}, ${skipped} skipped, ${refusedFields} fields refused`)
  await prisma.$disconnect()
  process.exit(skipped === 0 && refusedFields === 0 ? 0 : 1)
}

main().catch(async error => {
  console.error(error)
  await prisma.$disconnect()
  process.exit(1)
})
