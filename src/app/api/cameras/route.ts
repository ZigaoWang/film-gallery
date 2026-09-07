import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { allocateSlug } from '@/lib/seo/ensureSlug'
import { readJsonObject, invalidBody, asString, asInt } from '@/lib/requestBody'
import { toBodyType } from '@/lib/cameraFields'
import { normalizeAliases } from '@/lib/filmFields'
import { resolveBrand } from '@/lib/brands'
import { enforceLimit } from '@/lib/rateLimit'
import { LIMITS } from '@/lib/rateLimitPolicy'

export async function GET() {
  const cameras = await prisma.camera.findMany()

  // Only include imageUrl and description for approved images
  const sanitizedCameras = cameras.map(camera => ({
    ...camera,
    imageUrl: camera.imageStatus === 'approved' ? camera.imageUrl : null,
    description: camera.imageStatus === 'approved' ? camera.description : null,
    // Don't expose moderation fields to public
    imageStatus: undefined,
    imageUploadedBy: undefined,
    imageUploadedAt: undefined
  }))

  return NextResponse.json(sanitizedCameras)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = (session.user as { id: string }).id

  const limited = enforceLimit(
    'catalogCreate', userId, LIMITS.catalogCreate.perUser,
    'Too many new catalog entries in a short time. Please wait a moment.'
  )
  if (limited) return limited

  const contentLength = req.headers.get('content-length')
  if (contentLength && parseInt(contentLength) > 10 * 1024 * 1024) {
    return NextResponse.json({ error: 'File too large. Maximum size is 10MB.' }, { status: 413 })
  }

  try {
    const contentType = req.headers.get('content-type') || ''
    let name: string
    let brand: string | undefined
    let hasImageData = false
    let imageFile: File | null = null
    let description: string | undefined
    let cameraType: string | undefined
    let format: string | undefined
    let year: number | undefined
    let defaultFilmStockId: string | undefined
    let aliasesInput: string | undefined

    // Check if it's FormData (with image) or JSON (without image)
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData()
      name = formData.get('name') as string
      brand = (formData.get('brand') as string) || undefined
      imageFile = formData.get('image') as File | null
      description = (formData.get('description') as string) || undefined
      cameraType = (formData.get('cameraType') as string) || undefined
      format = (formData.get('format') as string) || undefined
      year = asInt(formData.get('year'))
      defaultFilmStockId = (formData.get('defaultFilmStockId') as string) || undefined
      aliasesInput = (formData.get('aliases') as string) || undefined
      hasImageData = !!imageFile
    } else {
      const body = await readJsonObject(req)
      if (!body) return invalidBody()
      name = asString(body.name) ?? ''
      brand = asString(body.brand)
      cameraType = asString(body.cameraType)
      format = asString(body.format)
      year = asInt(body.year)
      defaultFilmStockId = asString(body.defaultFilmStockId) || undefined
      aliasesInput = Array.isArray(body.aliases)
        ? body.aliases.filter((a): a is string => typeof a === 'string').join(',')
        : asString(body.aliases)
    }

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    // An unrecognised value becomes null rather than an error: the body type is
    // optional, and null means "not yet classified" rather than "invalid".
    const bodyType = toBodyType(cameraType ?? null)

    // The brand relation, resolved the same way a film stock resolves its
    // maker. Only the free-text column was written here, so brandId was set on
    // nothing but the rows the brands migration backfilled, and camera search
    // matches brand through the relation: every body added since that
    // migration was unfindable by its maker's name.
    const brandRecord = brand?.trim() ? await resolveBrand(brand) : null

    // Create camera with categorization fields
    const camera = await prisma.camera.create({
      data: {
        name,
        brand,
        brandId: brandRecord?.id,
        slug: await allocateSlug('camera', name, brand),
        addedById: userId,
        bodyType,
        format,
        year,
        defaultFilmStockId,
        // Offered by the add dialog, so it has to be read here. A field a form
        // collects and an endpoint ignores is discarded without a word, which
        // this codebase has been caught doing before.
        aliases: normalizeAliases(aliasesInput ? aliasesInput.split(',') : []),
      }
    })

    // If image data was provided, upload it
    if (hasImageData && imageFile) {
      const { uploadToOSS } = await import('@/lib/oss')
      const { processItemImage } = await import('@/lib/imageProcessing')

      // Process image with same pipeline as suggest edit
      const buffer = Buffer.from(await imageFile.arrayBuffer())
      const processedBuffer = await processItemImage(buffer)

      // Upload to OSS
      const key = `cameras/${camera.id}.webp`
      const imageUrl = await uploadToOSS(processedBuffer, key)

      // Update camera with approved image (no moderation for new items)
      await prisma.camera.update({
        where: { id: camera.id },
        data: {
          imageUrl,
          description,
          imageStatus: 'approved',
          imageUploadedBy: userId,
          imageUploadedAt: new Date()
        }
      })
    } else if (description) {
      // Save description even without image
      await prisma.camera.update({
        where: { id: camera.id },
        data: {
          description,
          imageStatus: 'approved'
        }
      })
    }

    return NextResponse.json(camera)
  } catch (error) {
    console.error('Create camera error:', error)
    return NextResponse.json(
      { error: 'Failed to create camera' },
      { status: 500 }
    )
  }
}
