import { PageSkeleton, Bar } from '@/components/ui/Skeleton'

/**
 * The front page, which is a full-height hero over a masonry of photographs.
 *
 * Almost everything in it is fixed — the wordmark, the tagline, the two
 * buttons — and only the three counts and the photographs behind them come
 * from the database. So this is the hero's own geometry with bars where those
 * numbers go, rather than a generic page placeholder: the height, the centring
 * and the gaps are copied from HeroSection so nothing moves when it arrives.
 */
export default function Loading() {
  return (
    <PageSkeleton>
      {/* dvh and the 64px header offset, matching HeroSection exactly. */}
      <section className="relative flex h-[calc(100dvh-64px)] items-center justify-center">
        <div className="relative z-10 -mt-16 px-6 text-center">
          {/* The wordmark is 260px wide on a phone and 320 above it, at 64 tall. */}
          <Bar className="mx-auto mb-4 h-16 w-[260px] md:w-[320px]" />
          {/* h-7 is the line height of the text-lg tagline. */}
          <Bar className="mx-auto mb-6 h-7 w-64 max-w-full" delay={160} />

          {/* Three counts with the hero's own dividers between them. The rules
              are static, so they are the real thing rather than a placeholder
              for one. */}
          <div className="mb-8 flex items-center justify-center gap-6">
            {[0, 1, 2].map(i => (
              <div key={i} className="flex items-center gap-6">
                {i > 0 && <div className="h-8 w-px bg-neutral-700" />}
                <div>
                  {/* h-9 is text-3xl, the size the counts render at, over the
                      10px uppercase label under it. */}
                  <Bar className="mx-auto h-9 w-16" delay={i * 160} />
                  <Bar className="mx-auto mt-1 h-3 w-14" delay={i * 160 + 80} />
                </div>
              </div>
            ))}
          </div>

          {/* Two size-md buttons, which are 40px tall. */}
          <div className="flex items-center justify-center gap-3">
            <Bar className="h-10 w-28" delay={320} />
            <Bar className="h-10 w-28" delay={400} />
          </div>
        </div>
      </section>
    </PageSkeleton>
  )
}
