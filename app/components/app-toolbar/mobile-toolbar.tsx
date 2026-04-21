import { useEnhancedBreadcrumbs } from '@/components/breadcrumb/breadcrumb-provider';
import { useApp } from '@/providers/app.provider';
import { Button } from '@datum-cloud/datum-ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@datum-cloud/datum-ui/dropdown';
import { cn } from '@datum-cloud/datum-ui/utils';
import { useLingui } from '@lingui/react/macro';
import { ChevronLeft, MoreVertical } from 'lucide-react';
import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router';

interface MobileToolbarProps {
  scrolled: boolean;
}

export function MobileToolbar({ scrolled }: MobileToolbarProps) {
  const { actions, navigation } = useApp();
  const items = useEnhancedBreadcrumbs();
  const navigate = useNavigate();
  const { t } = useLingui();

  const { current, parentPath, trail } = useMemo(() => {
    if (items.length === 0) {
      return { current: null, parentPath: null, trail: [] as typeof items };
    }
    const last = items[items.length - 1];
    const parent = items.length >= 2 ? items[items.length - 2] : null;
    // Trail = everything above "current", in top-down order
    const parents = items.slice(0, -1).filter((item) => item.path);
    return {
      current: last,
      parentPath: parent?.path ?? null,
      trail: parents,
    };
  }, [items]);

  const hasActions = actions.length > 0;
  const hasTrail = trail.length > 0;
  const showOverflow = hasActions || hasTrail;

  return (
    <div
      className={cn(
        'bg-background sticky top-0 z-10 flex shrink-0 flex-col border-b ease-linear',
        scrolled && 'shadow-sm'
      )}>
      {/* Row 1 — current breadcrumb + overflow */}
      <div className="flex h-12 items-center gap-1 px-2">
        {parentPath ? (
          <Button
            htmlType="button"
            theme="borderless"
            size="icon"
            aria-label={t`Back`}
            onClick={() => navigate(parentPath)}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
        ) : null}

        <div className="min-w-0 flex-1 truncate text-sm font-medium">{current?.label ?? null}</div>

        {showOverflow && (
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button htmlType="button" theme="borderless" size="icon" aria-label={t`More options`}>
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {hasTrail && (
                <>
                  <DropdownMenuLabel>{t`Navigate up`}</DropdownMenuLabel>
                  {trail.map((item, idx) => (
                    <DropdownMenuItem key={idx} asChild>
                      <Link to={item.path!}>{item.label}</Link>
                    </DropdownMenuItem>
                  ))}
                </>
              )}
              {hasTrail && hasActions && <DropdownMenuSeparator />}
              {hasActions && (
                <>
                  <DropdownMenuLabel>{t`Actions`}</DropdownMenuLabel>
                  {actions.map((action, idx) => (
                    <div key={idx} className="px-2 py-1.5">
                      {action}
                    </div>
                  ))}
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Row 2 — navigation (tabs etc.) */}
      {navigation && (
        <div className="flex items-center gap-2 overflow-x-auto border-t px-2 py-2 [&>*]:shrink-0">
          {navigation}
        </div>
      )}
    </div>
  );
}
