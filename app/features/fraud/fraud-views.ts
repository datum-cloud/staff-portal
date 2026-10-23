import type { ViewTab } from '@/features/milo';
import { ENTITY_ICONS } from '@/utils/config/icons.config';
import { fraudRoutes } from '@/utils/config/routes.config';
import { useLingui } from '@lingui/react/macro';
import { FileText, Truck } from 'lucide-react';

/** Fraud & Abuse's views, as segmented tabs on each of its pages. */
export function useFraudViews(): ViewTab[] {
  const { t } = useLingui();
  return [
    {
      label: t`Evaluations`,
      href: fraudRoutes.evaluations.list(),
      icon: ENTITY_ICONS.fraud,
      end: true,
    },
    { label: t`Providers`, href: fraudRoutes.providers.list(), icon: Truck },
    { label: t`Policy`, href: fraudRoutes.policy(), icon: FileText },
  ];
}
