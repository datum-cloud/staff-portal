/**
 * Skeleton placeholder for the list-style cards in the service overview
 * (Monitored Resources, Meters, Quota Limits). Renders `count` rows that
 * match the typical content shape: a label line, a meta line, and a
 * description line.
 */
export function CardRowSkeleton({ count = 2 }: { count?: number }) {
  return (
    <div className="flex flex-col divide-y">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex flex-col gap-1.5 py-2 first:pt-0 last:pb-0">
          <div className="bg-muted h-4 w-2/5 animate-pulse rounded" />
          <div className="bg-muted h-3 w-1/3 animate-pulse rounded" />
          <div className="bg-muted h-3 w-3/4 animate-pulse rounded" />
        </div>
      ))}
    </div>
  );
}
