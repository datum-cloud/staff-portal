import {
  formatSpendBand,
  getApplicationPhase,
  type ApplicantOrganizationType,
  type ApplicationPaymentOption,
  type ApplicationPhase,
  type BillingArrangementApplication,
  type EstimatedMonthlySpend,
} from '../lib/payment-terms-applications';
import { BadgeState } from '@/components/badge';
import { useLingui } from '@lingui/react/macro';

const phaseBadgeState: Record<ApplicationPhase, string> = {
  Pending: 'pending',
  Approved: 'approved',
  Declined: 'declined',
  Withdrawn: 'inactive',
};

/** Labels for the values a customer picks when applying for payment terms. */
export function useApplicationLabels() {
  const { t, i18n } = useLingui();
  const phase: Record<ApplicationPhase, string> = {
    Pending: t`Pending`,
    Approved: t`Approved`,
    Declined: t`Declined`,
    Withdrawn: t`Withdrawn`,
  };
  const paymentOption: Record<ApplicationPaymentOption, string> = {
    Invoice: t`Pay by invoice`,
    NotSure: t`Not sure`,
  };
  const organizationType: Record<ApplicantOrganizationType, string> = {
    Company: t`Company`,
    PartnerOrReseller: t`Partner or reseller`,
    Nonprofit: t`Nonprofit`,
    EducationOrResearch: t`Education or research`,
    Other: t`Other`,
  };
  const spend = (band: EstimatedMonthlySpend, currency: string) =>
    formatSpendBand(band, currency, i18n.locale) ?? t`Not sure`;
  return { phase, paymentOption, organizationType, spend };
}

export function ApplicationPhaseBadge({
  application,
  tooltip,
}: {
  application: BillingArrangementApplication;
  tooltip?: string;
}) {
  const labels = useApplicationLabels();
  const phase = getApplicationPhase(application);
  return (
    <BadgeState state={phaseBadgeState[phase]} message={labels.phase[phase]} tooltip={tooltip} />
  );
}
