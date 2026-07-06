import { CONTEXTBAR_H, NAVBAR_H } from '../../lib/dimensions';
import { Breadcrumb, useEnhancedBreadcrumbs } from '@/components/breadcrumb';
import { Trans } from '@lingui/react/macro';

export function MiloContextBar() {
  const items = useEnhancedBreadcrumbs();

  return (
    <div
      style={{ height: CONTEXTBAR_H, top: NAVBAR_H }}
      className="bg-background sticky z-20 flex shrink-0 items-center gap-2 border-b px-4">
      {items.length > 0 && (
        <span className="text-muted-foreground shrink-0 text-xs">
          <Trans>You&apos;re here:</Trans>
        </span>
      )}
      <Breadcrumb
        listClassName="text-xs font-normal [&_*]:font-normal [&_a]:text-muted-foreground [&_[aria-current=page]]:text-muted-foreground"
        separator="/"
      />
    </div>
  );
}
