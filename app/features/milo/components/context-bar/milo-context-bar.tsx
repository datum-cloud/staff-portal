import { CONTEXTBAR_H, NAVBAR_H } from '../../lib/dimensions';
import { Breadcrumb, useEnhancedBreadcrumbs } from '@/components/breadcrumb';
import { Text } from '@datum-cloud/datum-ui/typography';
import { Trans } from '@lingui/react/macro';

export function MiloContextBar() {
  const items = useEnhancedBreadcrumbs();

  return (
    <div
      style={{ height: CONTEXTBAR_H, top: NAVBAR_H }}
      className="bg-background sticky z-20 flex shrink-0 items-center gap-2 border-b px-4">
      {items.length > 0 && (
        <Text size="xs" textColor="muted" className="shrink-0">
          <Trans>You&apos;re here:</Trans>
        </Text>
      )}
      <Breadcrumb
        listClassName="text-xs font-normal [&_*]:font-normal [&_a]:text-muted-foreground [&_[aria-current=page]]:text-muted-foreground"
        separator="/"
      />
    </div>
  );
}
