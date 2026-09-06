import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { rateLimit, clientIp } from '@/lib/rateLimit'
import { LIMITS, limitKey } from '@/lib/rateLimitPolicy'

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  const baseUrl = process.env.NEXTAUTH_URL || 'https://avoidxray.com'

  // Spending a verification token is the same act as spending a reset token —
  // 256 bits of randomness at an unauthenticated endpoint — so it takes the
  // same policy, for the same reason: without one this was a free database
  // lookup on every call.
  //
  // Answered with a redirect rather than the 429 body the other token
  // endpoints send, because this one is reached by clicking a link in an
  // email. A JSON error in the middle of a browser navigation would leave the
  // reader staring at raw text.
  const byIp = rateLimit(limitKey('verify-ip', clientIp(req.headers)), LIMITS.passwordReset.perIp.limit, LIMITS.passwordReset.perIp.windowMs)
  if (!byIp.ok) {
    return NextResponse.redirect(new URL('/login?error=invalid', baseUrl))
  }

  if (!token) {
    return NextResponse.redirect(new URL('/login?error=invalid', baseUrl))
  }

  const user = await prisma.user.findFirst({
    where: {
      verificationToken: token,
      verificationTokenExpiry: { gt: new Date() }
    }
  })

  if (!user) {
    return NextResponse.redirect(new URL('/login?error=expired', baseUrl))
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerified: true,
      verificationToken: null,
      verificationTokenExpiry: null
    }
  })

  return NextResponse.redirect(new URL('/login?verified=true', baseUrl))
}
