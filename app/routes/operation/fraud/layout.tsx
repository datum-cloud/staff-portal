import { DetailShell, type EntityTab } from '@/features/milo';
import { ENTITY_ICONS } from '@/utils/config/icons.config';
import { fraudRoutes } from '@/utils/config/routes.config';
import { Trans, useLingui } from '@lingui/react/macro';
import { FileText, Truck } from 'lucide-react';

export const handle = {
  breadcrumb: () => <Trans>Fraud &amp; Abuse</Trans>,
};

/**
 * Fraud & Abuse: a section header + Evaluations / Providers / Policy tabs,
 * following the detail-page shell. Sub-pages register their primary action via
 * AppActionBar so it lands in the header (not the table), and flow with window
 * scroll so the card-style Policy and detail pages aren't clipped.
 */
export default function FraudLayout() {
  const { t } = useLingui();

  const tabs: EntityTab[] = [
    { label: t`Evaluations`, href: fraudRoutes.evaluations.list(), icon: ENTITY_ICONS.fraud },
    { label: t`Providers`, href: fraudRoutes.providers.list(), icon: Truck },
    { label: t`Policy`, href: fraudRoutes.policy(), icon: FileText },
  ];

  return (
    <DetailShell
      icon={
        <div className="bg-muted flex size-10 items-center justify-center rounded-md">
          <ENTITY_ICONS.fraud className="size-5" />
        </div>
      }
      name={t`Fraud & Abuse`}
      tabs={tabs}
    />
  );
}
