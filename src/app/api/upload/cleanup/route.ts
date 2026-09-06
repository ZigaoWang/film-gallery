import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { deleteFromOSS } from '@/lib/oss'
import { extractKeyFromUrl } from '@/lib/ossUtils'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { readJsonObject, invalidBody } from '@/lib/requestBody'
import { enforceLimit } from '@/lib/rateLimit'
import { LIMITS } from '@/lib/rateLimitPolicy'

async function deletePhoto(photo: { id: string; originalPath: string; mediumPath: string; thumbnailPath: string }) {
  const keys = [photo.originalPath, photo.mediumPath, photo.thumbnailPath]
    .map(extractKeyFromUrl)
    .filter((k): k is string => k !== null)
  await Promise.all(keys.map(key => deleteFromOSS(key).catch(() => {})))
  await prisma.photo.delete({ where: { id: photo.id } })
}

// GET: Cron job to clean up old unpublished photos
// Requires CRON_SECRET in production
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  // In production, require CRON_SECRET
  if (process.env.NODE_ENV === 'production') {
    if (!cronSecret) {
      return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 })
    }
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  // Delete unpublished photos older than 1 hour
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)

  const oldPhotos = await prisma.photo.findMany({
    where: { published: false, createdAt: { lt: oneHourAgo } }
  })

  let deleted = 0
  for (const photo of oldPhotos) {
    try {
      await deletePhoto(photo)
      deleted++
    } catch (e) {
      console.error(`Failed to delete photo ${photo.id}:`, e)
    }
  }

  return NextResponse.json({ success: true, deleted, checked: oldPhotos.length })
}

/**
 * Upper bound on ids accepted in one request, matching the bulk photo routes.
 *
 * Without it a single call became an unbounded `IN (...)` and an unbounded set
 * of storage deletions. Truncating rather than refusing is safe here because
 * the GET sweep above collects anything left behind within the hour.
 */
const MAX_IDS = 200

// POST: User-initiated cleanup for their own unpublished photos
// Called when user leaves upload page without publishing
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = (session.user as { id: string }).id

  // Sized against the upload limit rather than the content-write one: the
  // upload page calls this once per photo removed from a drop, so pruning a
  // roll frame by frame is legitimately one request each. Its own namespace,
  // so uploading and tidying up do not draw on a single allowance.
  const limited = enforceLimit(
    'upload-cleanup', userId, LIMITS.upload.perUser,
    'Too many deletions in a short time. Please wait a little and continue.'
  )
  if (limited) return limited

  const body = await readJsonObject(req)
  if (!body) return invalidBody()
  // Only the string members count; a mixed array should not reach the query.
  const ids = Array.isArray(body.ids)
    ? [...new Set(body.ids.filter((id): id is string => typeof id === 'string' && id.length > 0))].slice(0, MAX_IDS)
    : []
  if (!ids.length) return NextResponse.json({ success: true, deleted: 0 })

  // The same test the per-row check made — yours, and not yet published —
  // expressed as part of the query, so an id belonging to someone else is
  // simply not found and the storage deletion below never sees their files.
  const photos = await prisma.photo.findMany({
    where: { id: { in: ids }, userId, published: false },
    select: { id: true, originalPath: true, mediumPath: true, thumbnailPath: true },
  })
  if (!photos.length) return NextResponse.json({ success: true, deleted: 0 })

  const keys = photos.flatMap(p => [p.originalPath, p.mediumPath, p.thumbnailPath])
    .map(extractKeyFromUrl)
    .filter((k): k is string => k !== null)
  await Promise.all(keys.map(key => deleteFromOSS(key).catch(() => {})))

  // Ownership is repeated on the delete so a publish that landed between the
  // two queries keeps its row rather than losing it to a stale read.
  const result = await prisma.photo.deleteMany({
    where: { id: { in: photos.map(p => p.id) }, userId, published: false },
  })

  return NextResponse.json({ success: true, deleted: result.count })
}

// DELETE: Admin endpoint to force cleanup all unpublished photos
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { id: (session.user as { id: string }).id }
  })

  if (!user?.isAdmin) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  const unpublishedPhotos = await prisma.photo.findMany({
    where: { published: false }
  })

  let deleted = 0
  for (const photo of unpublishedPhotos) {
    try {
      await deletePhoto(photo)
      deleted++
    } catch (e) {
      console.error(`Failed to delete photo ${photo.id}:`, e)
    }
  }

  return NextResponse.json({ success: true, deleted })
}
