import { PageSkeleton, ComboDetailSkeleton } from '@/components/ui/Skeleton'

export default function Loading() {
  return (
    <PageSkeleton>
      <ComboDetailSkeleton />
    </PageSkeleton>
  )
}
