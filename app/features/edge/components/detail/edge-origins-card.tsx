import { ButtonCopy } from '@/components/button';
import type { HttpProxy } from '@/features/edge/lib';
import { SectionCard } from '@/features/milo';
import { Text } from '@datum-cloud/datum-ui/typography';
import { Trans } from '@lingui/react/macro';
import { useMemo } from 'react';

export function EdgeOriginsCard({ proxy }: { proxy: HttpProxy }) {
  const origins = useMemo(() => {
    if (proxy.origins && proxy.origins.length > 0) return proxy.origins;
    if (proxy.endpoint) return [proxy.endpoint];
    return [];
  }, [proxy]);

  return (
    <SectionCard title={<Trans>Origin</Trans>}>
      {origins.length > 0 ? (
        <div className="flex flex-col gap-2">
          {origins.map((origin) => (
            <div
              key={origin}
              className="border-input bg-background flex items-center justify-between gap-2 rounded-md border p-2">
              <Text className="text-sm font-medium break-all">{origin}</Text>
              <ButtonCopy value={origin} />
            </div>
          ))}
        </div>
      ) : (
        <Text textColor="muted" className="text-sm">
          <Trans>No origins configured</Trans>
        </Text>
      )}
    </SectionCard>
  );
}
