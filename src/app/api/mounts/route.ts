import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

/**
 * The lens mounts a camera can be given.
 *
 * Exists so the mount is chosen from a list rather than typed. It used to be a
 * free string, and the two cameras that had one disagreed about how to write
 * it: "Canon FD" against "M42 screw". A picker is the only version of this
 * field that can be relied on afterwards, because it is the only one where two
 * people entering the same mount produce the same value.
 *
 * "Fixed lens" is in the list on purpose. A compact derives it from its body
 * type, but a rangefinder cannot, so somebody cataloguing an Olympus 35 SP
 * needs to be able to say it.
 */
export async function GET() {
  const mounts = await prisma.lensMount.findMany({
    select: { id: true, name: true },
    // Interchangeable mounts first and alphabetical, with the fixed-lens answer
    // last: it is the odd one out and belongs at the end of a list, not filed
    // under F in the middle of it.
    orderBy: [{ fixed: 'asc' }, { name: 'asc' }],
  })
  return NextResponse.json(mounts)
}
