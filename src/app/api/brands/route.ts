import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

/**
 * The brands a film's maker can be chosen from.
 *
 * Exists so `manufacturedByBrandId` can be a picker rather than a typed id. The
 * column was unreachable from every form, which is why a stock's real maker
 * could not be corrected without opening the database.
 */
export async function GET() {
  const brands = await prisma.brand.findMany({
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  })
  return NextResponse.json(brands)
}
