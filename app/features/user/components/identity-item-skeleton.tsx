import { Skeleton } from '@datum-cloud/datum-ui/skeleton';
import { cn } from '@datum-cloud/datum-ui/utils';

interface IdentityItemSkeletonProps {
  /**
   * Number of skeleton items to render
   */
  count?: number;

  /**
   * Show skeleton for right action buttons
   */
  showActions?: boolean;

  /**
   * Optional className for custom styling
   */
  className?: string;
}

/**
 * Skeleton loading state for IdentityItem component
 * Matches the exact layout and styling of IdentityItem
 */
export const IdentityItemSkeleton = ({
  count = 1,
  showActions = true,
  className,
}: IdentityItemSkeletonProps) => {
  return (
    <div className="divide-stepper-line flex flex-col divide-y">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className={cn('flex items-center justify-between gap-6 py-2', className)}>
          {/* Left Section */}
          <div className="flex items-center space-x-3.5">
            <div className="bg-muted flex size-[34px] items-center justify-center rounded-lg">
              <Skeleton className="size-3.5 rounded-sm" />
            </div>

            <div className="flex flex-col space-y-0.5 text-left">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-3 w-40" />
            </div>
          </div>

          {/* Right Section - matches: flex items-center justify-end gap-10 */}
          {showActions && (
            <div className="flex items-center justify-end gap-10">
              <Skeleton className="h-7 w-20 rounded-lg" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

IdentityItemSkeleton.displayName = 'IdentityItemSkeleton';
