import { useOrgAccountSummary } from '../hooks/use-org-account-summary';
import { OnboardingSteps } from './org-onboarding-card';
import { BadgeState } from '@/components/badge';
import { FraudDecisionBadge, FraudScore } from '@/features/fraud';
import { SectionCard } from '@/features/milo';
import { billingAccountRoutes, fraudRoutes, orgRoutes } from '@/utils/config/routes.config';
import { Button } from '@datum-cloud/datum-ui/button';
import { Dialog } from '@datum-cloud/datum-ui/dialog';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { Skeleton } from '@datum-cloud/datum-ui/skeleton';
import { Text } from '@datum-cloud/datum-ui/typography';
import { cn } from '@datum-cloud/datum-ui/utils';
import { Plural, Trans } from '@lingui/react/macro';
import type { ComMiloapisResourcemanagerV1Alpha1Organization } from '@openapi/resourcemanager.miloapis.com/v1alpha1';
import { ChevronRight } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Link } from 'react-router';

const Muted = ({ children }: { children: ReactNode }) => (
  <Text as="span" size="sm" textColor="muted">
    {children}
  </Text>
);

const None = () => <Muted>—</Muted>;

const ROW = 'flex items-center justify-between gap-3 py-2';
const INTERACTIVE =
  'hover:bg-muted/30 focus-visible:ring-ring -mx-2 rounded-md px-2 transition-colors focus-visible:ring-2 focus-visible:outline-none';

/**
 * One fact: a label on the left, its value on the right, and a chevron when
 * it opens something: a page (`to`) or something in place, like a dialog
 * (`onClick`).
 */
function Row({
  label,
  loading,
  to,
  onClick,
  children,
}: {
  label: ReactNode;
  loading?: boolean;
  to?: string;
  onClick?: () => void;
  children: ReactNode;
}) {
  const value = loading ? <Skeleton className="h-4 w-20" /> : children;
  const content = (
    <>
      <Text as="span" size="sm" textColor="muted" className="shrink-0">
        {label}
      </Text>
      <span className="flex min-w-0 items-center justify-end gap-1.5 text-right">
        <span className="min-w-0 truncate">{value}</span>
        {(to || onClick) && (
          <Icon icon={ChevronRight} size={14} aria-hidden className="text-muted-foreground" />
        )}
      </span>
    </>
  );
  return (
    // `grid` lets the link or button stretch across its negative margin on both sides.
    <li className="grid">
      {to && !loading ? (
        <Link to={to} className={cn(ROW, INTERACTIVE)}>
          {content}
        </Link>
      ) : onClick && !loading ? (
        <button type="button" onClick={onClick} className={cn(ROW, INTERACTIVE)}>
          {content}
        </button>
      ) : (
        <div className={ROW}>{content}</div>
      )}
    </li>
  );
}

/**
 * The organization overview's Account card (#770): onboarding, billing,
 * payment method, the highest fraud score among the owners, members and
 * contact, each linking to its full details where a page exists.
 */
export function OrgAccountCard({
  orgName,
  k8sOrg,
  className,
}: {
  orgName: string;
  k8sOrg: ComMiloapisResourcemanagerV1Alpha1Organization | undefined;
  className?: string;
}) {
  const { summary, onboarding: onboardingDetails, loading } = useOrgAccountSummary(orgName, k8sOrg);
  const { onboarding, billing, paymentMethod, fraud, members, contact } = summary;
  const billingLink = billing && billingAccountRoutes.detail(orgName, billing.accountName);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const orgDisplayName =
    onboardingDetails.org?.contactInfo?.businessName ||
    onboardingDetails.org?.displayName ||
    orgName;

  return (
    <section className={className}>
      <SectionCard title={<Trans>Account</Trans>}>
        <ul className="divide-border flex flex-col divide-y">
          <Row
            label={<Trans>Onboarding</Trans>}
            loading={loading.org || loading.billing}
            onClick={() => setOnboardingOpen(true)}>
            <Text as="span" size="sm">
              <Trans>
                {onboarding.complete} of {onboarding.total} complete
              </Trans>
            </Text>
          </Row>
          <Row label={<Trans>Billing account</Trans>} loading={loading.billing} to={billingLink}>
            {billing ? <BadgeState state={billing.state} tooltip={billing.tooltip} /> : <None />}
          </Row>
          <Row label={<Trans>Payment method</Trans>} loading={loading.billing} to={billingLink}>
            {paymentMethod.state === 'None' ? <None /> : <BadgeState state={paymentMethod.state} />}
          </Row>
          <Row
            label={<Trans>Fraud score (highest owner)</Trans>}
            loading={loading.fraud}
            to={fraud && fraudRoutes.evaluations.detail(fraud.evaluationName)}>
            {fraud ? (
              <span className="inline-flex items-center gap-2">
                <FraudScore score={fraud.score} decision={fraud.decision} />
                <FraudDecisionBadge decision={fraud.decision} />
              </span>
            ) : (
              <None />
            )}
          </Row>
          <Row
            label={<Trans>Members</Trans>}
            loading={loading.members}
            to={orgRoutes.member(orgName)}>
            <Text as="span" size="sm">
              {members.count} · <Plural value={members.owners} one="# owner" other="# owners" />
            </Text>
          </Row>
          <Row label={<Trans>Contact</Trans>} loading={loading.org}>
            {contact.name ? (
              <Text as="span" size="sm">
                {contact.name}
              </Text>
            ) : (
              <None />
            )}
          </Row>
          <Row label={<Trans>Email</Trans>} loading={loading.org}>
            {contact.email ? (
              <Text as="span" size="sm" title={contact.email}>
                {contact.email}
              </Text>
            ) : (
              <None />
            )}
          </Row>
          <Row label={<Trans>Location</Trans>} loading={loading.org || loading.billing}>
            {contact.location ? (
              <Text as="span" size="sm">
                {contact.location}
              </Text>
            ) : (
              <None />
            )}
          </Row>
        </ul>
      </SectionCard>

      {/* The onboarding steps from the old Onboarding card. */}
      <Dialog open={onboardingOpen} onOpenChange={setOnboardingOpen}>
        <Dialog.Content className="sm:max-w-3xl">
          <Dialog.Header
            title={orgDisplayName}
            description={<Trans>Onboarding steps and status</Trans>}
          />
          <Dialog.Body className="pb-4">
            <OnboardingSteps
              org={onboardingDetails.org}
              hasBillingAccount={onboardingDetails.hasBillingAccount}
              paymentMethodFailed={onboardingDetails.paymentMethodFailed}
            />
          </Dialog.Body>
          <Dialog.Footer>
            <Button type="quaternary" theme="borderless" onClick={() => setOnboardingOpen(false)}>
              <Trans>Close</Trans>
            </Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog>
    </section>
  );
}
