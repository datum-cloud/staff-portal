import {
  buildArrangementSpec,
  getArrangementPhase,
  getArrangementStart,
  getArrangementsForAccount,
  getBillingStatus,
  getCurrentArrangement,
  getNextTermsStart,
  getPaymentReadyCondition,
  type BillingArrangement,
  type BillingArrangementPhase,
  type PaymentTermsFormValues,
} from '../lib/payment-terms';
import {
  buildDeclineSpec,
  declineApplicationFormSchema,
  emptyDeclineApplicationForm,
  getApplicationPhase,
  getArrangementForApplication,
  getDeclineForApplication,
  getWebsiteHref,
  MAX_DECLINE_MESSAGE_LENGTH,
  paymentTermsFormFromApplication,
  type DeclineApplicationFormValues,
} from '../lib/payment-terms-applications';
import { formatBillingAddress, getBillingAccountDisplayName } from '../utils';
import { ApplicationPhaseBadge, useApplicationLabels } from './application-labels';
import { PaymentTermsFormDialog } from './payment-terms-card';
import { BadgeState } from '@/components/badge';
import { DateTime } from '@/components/date';
import { DescriptionList } from '@/components/description-list';
import { DialogForm } from '@/components/dialog';
import { DisplayName } from '@/components/display';
import { PageHeader } from '@/components/page-header';
import { FraudDecisionBadge } from '@/features/fraud';
import { SectionCard } from '@/features/milo';
import {
  useApproveBillingArrangementApplicationMutation,
  useBillingAccountDetailQuery,
  useBillingArrangementApplicationDetailQuery,
  useBillingArrangementDeclineListForOrgQuery,
  useBillingArrangementListForOrgQuery,
  useDeclineBillingArrangementApplicationMutation,
  useFraudEvaluationListQuery,
  useOrganizationQuery,
} from '@/resources/request/client';
import {
  billingAccountRoutes,
  fraudRoutes,
  orgRoutes,
  userRoutes,
} from '@/utils/config/routes.config';
import { Button, LinkButton } from '@datum-cloud/datum-ui/button';
import { Form } from '@datum-cloud/datum-ui/form';
import { Col, Row } from '@datum-cloud/datum-ui/grid';
import { Skeleton } from '@datum-cloud/datum-ui/skeleton';
import { toast } from '@datum-cloud/datum-ui/toast';
import { Tooltip } from '@datum-cloud/datum-ui/tooltip';
import { Text } from '@datum-cloud/datum-ui/typography';
import { Trans, useLingui } from '@lingui/react/macro';
import { useMemo, useState } from 'react';
import { Link } from 'react-router';

const billingStatusBadgeState: Record<ReturnType<typeof getBillingStatus>, string> = {
  invoice: 'success',
  card: 'success',
  'terms-scheduled': 'info',
  'terms-ended': 'error',
  'card-failing': 'error',
  'not-set-up': 'error',
  unknown: 'warning',
};

type ApplicationReviewProps = {
  orgName: string;
  applicationName: string;
};

/**
 * One payment terms application: what the customer sent, the billing
 * account it's for, and, while it's pending, the decision. Approving grants
 * terms that name the application; declining records a message for the
 * customer and notes for staff.
 */
export function ApplicationReview({ orgName, applicationName }: ApplicationReviewProps) {
  const { t } = useLingui();
  const labels = useApplicationLabels();

  const applicationQuery = useBillingArrangementApplicationDetailQuery(orgName, applicationName);
  const application = applicationQuery.data;
  const accountName = application?.spec?.billingAccountRef?.name ?? '';
  const phase = application ? getApplicationPhase(application) : undefined;

  const accountQuery = useBillingAccountDetailQuery(orgName, accountName);
  const organizationQuery = useOrganizationQuery(orgName);
  const arrangementsQuery = useBillingArrangementListForOrgQuery(orgName);
  const declinesQuery = useBillingArrangementDeclineListForOrgQuery(
    phase === 'Declined' ? orgName : ''
  );

  const approveMutation = useApproveBillingArrangementApplicationMutation(orgName, accountName);
  const declineMutation = useDeclineBillingArrangementApplicationMutation(orgName, accountName);
  const [approveOpen, setApproveOpen] = useState(false);
  const [declineOpen, setDeclineOpen] = useState(false);

  const account = accountQuery.data;
  const currency = account?.spec?.currencyCode ?? '';
  const accountArrangements = useMemo(
    () => getArrangementsForAccount(arrangementsQuery.data?.items ?? [], accountName),
    [arrangementsQuery.data?.items, accountName]
  );
  const currentTerms = useMemo(
    () => getCurrentArrangement(accountArrangements),
    [accountArrangements]
  );
  // Approved terms can't overlap the account's existing ones: a renewal
  // starts when they end, and terms with no end date block approval.
  const nextStart = useMemo(() => getNextTermsStart(accountArrangements), [accountArrangements]);
  const renewsFrom = nextStart.kind === 'after' ? nextStart.startsAt : undefined;
  const decline = getDeclineForApplication(declinesQuery.data?.items ?? [], applicationName);
  const approvedTerms =
    application && phase === 'Approved'
      ? getArrangementForApplication(accountArrangements, application)
      : undefined;
  const applicantUid = application?.spec?.applicant?.uid;
  // Only the applicant's evaluations: the list is filtered by spec.userRef.name.
  const fraudQuery = useFraudEvaluationListQuery(
    { search: applicantUid },
    { enabled: !!applicantUid }
  );
  const fraudEvaluation = applicantUid ? fraudQuery.data?.items?.[0] : undefined;

  const handleApprove = async (values: PaymentTermsFormValues) => {
    try {
      await approveMutation.mutateAsync(
        buildArrangementSpec(values, accountName, { applicationName })
      );
      toast.success(t`Application approved`);
    } catch (error) {
      throw error; // keep the dialog open; the API error is already shown
    }
  };

  const handleDecline = async (values: DeclineApplicationFormValues) => {
    try {
      await declineMutation.mutateAsync(buildDeclineSpec(values, applicationName));
      toast.success(t`Application declined`);
    } catch (error) {
      throw error; // keep the dialog open; the API error is already shown
    }
  };

  if (applicationQuery.isLoading) {
    return (
      <div className="m-4 space-y-4" aria-busy="true">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!application || !phase) {
    return (
      <SectionCard className="m-4" contentClassName="flex items-center justify-center py-12">
        <Text size="sm" textColor="muted">
          <Trans>Application not found.</Trans>
        </Text>
      </SectionCard>
    );
  }

  const spec = application.spec;
  const invoice = spec?.invoice;
  const legalName = spec?.organization?.legalName || applicationName;
  const websiteHref = getWebsiteHref(spec?.organization?.website);
  const orgLabel =
    organizationQuery.data?.contactInfo?.businessName ||
    organizationQuery.data?.displayName ||
    orgName;
  const paymentReady = account ? getPaymentReadyCondition(account) : undefined;
  const billingStatus = getBillingStatus(paymentReady);
  const billingStatusLabel: Record<ReturnType<typeof getBillingStatus>, string> = {
    invoice: t`Invoice`,
    card: t`Card`,
    'terms-scheduled': t`Not billable yet: terms are scheduled`,
    'terms-ended': t`Not billable: terms have ended`,
    'card-failing': t`Not billable: card is failing`,
    'not-set-up': t`Not billable: no card or terms`,
    unknown: t`Unknown`,
  };
  const currentTermsPhase = currentTerms ? getArrangementPhase(currentTerms) : undefined;

  return (
    <div className="m-4 flex flex-col gap-4" data-e2e="payment-terms-application">
      <PageHeader
        title={legalName}
        description={t`Payment terms application from ${orgLabel}`}
        actions={
          phase === 'Pending' ? (
            <>
              <Button
                type="warning"
                theme="outline"
                onClick={() => setDeclineOpen(true)}
                data-e2e="application-decline">
                <Trans>Decline</Trans>
              </Button>
              {nextStart.kind === 'blocked' ? (
                <Tooltip
                  message={t`The account's payment terms have no end date. Give them one on the billing account to approve.`}>
                  {/* A disabled button gets no pointer events, so the span carries the tooltip. */}
                  <span tabIndex={0}>
                    <Button type="primary" theme="solid" disabled data-e2e="application-approve">
                      <Trans>Approve</Trans>
                    </Button>
                  </span>
                </Tooltip>
              ) : (
                <Button
                  type="primary"
                  theme="solid"
                  disabled={arrangementsQuery.isLoading}
                  onClick={() => setApproveOpen(true)}
                  data-e2e="application-approve">
                  <Trans>Approve</Trans>
                </Button>
              )}
            </>
          ) : (
            <LinkButton
              type="secondary"
              theme="outline"
              href={billingAccountRoutes.applications.list()}>
              <Trans>All applications</Trans>
            </LinkButton>
          )
        }
      />

      {phase !== 'Pending' ? (
        <SectionCard title={<Trans>Decision</Trans>}>
          <DescriptionList
            items={[
              {
                label: <Trans>Status</Trans>,
                value: <ApplicationPhaseBadge application={application} />,
              },
              {
                label: <Trans>Decided</Trans>,
                value: <DateTime date={application.status?.decidedAt} variant="both" />,
                hidden: phase === 'Withdrawn' || !application.status?.decidedAt,
              },
              {
                label: <Trans>Reason (internal)</Trans>,
                value: (
                  <Text className="whitespace-pre-line" data-e2e="application-approval-reason">
                    {approvedTerms?.spec?.reason || '—'}
                  </Text>
                ),
                hidden: phase !== 'Approved',
              },
              {
                label: <Trans>Payment terms</Trans>,
                value: (
                  <Link to={billingAccountRoutes.detail(orgName, accountName)}>
                    <Trans>View the terms on the billing account</Trans>
                  </Link>
                ),
                hidden: phase !== 'Approved',
              },
              {
                label: <Trans>Message to the customer</Trans>,
                value: (
                  <Text className="whitespace-pre-line">
                    {application.status?.declineMessage || decline?.spec?.message || '—'}
                  </Text>
                ),
                hidden: phase !== 'Declined',
              },
              {
                label: <Trans>Internal notes</Trans>,
                value: (
                  <Text className="whitespace-pre-line">{decline?.spec?.internalNotes || '—'}</Text>
                ),
                hidden: phase !== 'Declined',
              },
              {
                label: <Trans>Withdrawn</Trans>,
                value: <Trans>The customer withdrew this application before a decision.</Trans>,
                hidden: phase !== 'Withdrawn',
              },
            ]}
          />
        </SectionCard>
      ) : null}

      <Row type="flex" gutter={[16, 16]}>
        <Col span={24} lg={12}>
          <SectionCard className="h-full" title={<Trans>Application</Trans>}>
            <DescriptionList
              items={[
                {
                  label: <Trans>Status</Trans>,
                  value: <ApplicationPhaseBadge application={application} />,
                },
                {
                  label: <Trans>Asked for</Trans>,
                  value: <Text>{spec ? labels.paymentOption[spec.paymentOption] : '—'}</Text>,
                },
                {
                  label: <Trans>Legal name</Trans>,
                  value: <Text>{spec?.organization?.legalName ?? '—'}</Text>,
                },
                {
                  label: <Trans>Organization type</Trans>,
                  value: (
                    <Text>
                      {spec?.organization ? labels.organizationType[spec.organization.type] : '—'}
                    </Text>
                  ),
                },
                {
                  label: <Trans>Website</Trans>,
                  value: websiteHref ? (
                    <a href={websiteHref} target="_blank" rel="noreferrer noopener">
                      {spec?.organization?.website}
                    </a>
                  ) : (
                    <Text>{spec?.organization?.website || '—'}</Text>
                  ),
                },
                {
                  label: <Trans>Applicant</Trans>,
                  value: applicantUid ? (
                    <Link to={userRoutes.detail(applicantUid)}>
                      {spec?.applicant?.username || applicantUid}
                    </Link>
                  ) : (
                    <Text>{spec?.applicant?.username ?? '—'}</Text>
                  ),
                },
                {
                  label: <Trans>Fraud check</Trans>,
                  value: fraudEvaluation?.metadata?.name ? (
                    <Link
                      to={fraudRoutes.evaluations.detail(fraudEvaluation.metadata.name)}
                      className="inline-flex">
                      <FraudDecisionBadge decision={fraudEvaluation.status?.decision} />
                    </Link>
                  ) : (
                    <Text textColor="muted">
                      <Trans>No evaluation for this user</Trans>
                    </Text>
                  ),
                  hidden: !applicantUid,
                },
                {
                  label: <Trans>Authorized to apply</Trans>,
                  value: <Text>{spec?.authorized ? t`Yes` : t`No`}</Text>,
                },
                {
                  label: <Trans>Submitted</Trans>,
                  value: <DateTime date={application.metadata?.creationTimestamp} variant="both" />,
                },
              ]}
            />
          </SectionCard>
        </Col>

        <Col span={24} lg={12}>
          <SectionCard className="h-full" title={<Trans>Invoice details</Trans>}>
            {invoice ? (
              <DescriptionList
                items={[
                  {
                    label: <Trans>Estimated monthly spend</Trans>,
                    value: <Text>{labels.spend(invoice.estimatedMonthlySpend, currency)}</Text>,
                  },
                  {
                    label: <Trans>Accounts payable email</Trans>,
                    value: <Text>{invoice.accountsPayableEmail}</Text>,
                  },
                  {
                    label: <Trans>PO number</Trans>,
                    value: <Text>{invoice.purchaseOrderNumber || '—'}</Text>,
                  },
                  {
                    label: <Trans>Agreement reference</Trans>,
                    value: <Text>{invoice.agreementReference || '—'}</Text>,
                  },
                ]}
              />
            ) : (
              <Text size="sm" textColor="muted" className="block">
                <Trans>
                  The customer isn&apos;t sure how they&apos;d like to pay, so they didn&apos;t give
                  invoice details. Their situation below explains what they need.
                </Trans>
              </Text>
            )}
          </SectionCard>
        </Col>
      </Row>

      <SectionCard title={<Trans>Their situation</Trans>}>
        <Text as="p" size="sm" className="whitespace-pre-line">
          {spec?.situation || '—'}
        </Text>
      </SectionCard>

      <SectionCard title={<Trans>Billing account</Trans>}>
        <DescriptionList
          items={[
            {
              label: <Trans>Billing account</Trans>,
              value: account ? (
                <DisplayName
                  displayName={getBillingAccountDisplayName(account)}
                  name={accountName}
                  to={billingAccountRoutes.detail(orgName, accountName)}
                />
              ) : (
                <Text>{accountName || '—'}</Text>
              ),
            },
            {
              label: <Trans>Organization</Trans>,
              value: (
                <DisplayName displayName={orgLabel} name={orgName} to={orgRoutes.detail(orgName)} />
              ),
            },
            {
              label: <Trans>Billed by</Trans>,
              value: (
                <BadgeState
                  state={billingStatusBadgeState[billingStatus]}
                  message={billingStatusLabel[billingStatus]}
                  tooltip={paymentReady?.message}
                />
              ),
            },
            {
              label: <Trans>Current terms</Trans>,
              value:
                currentTerms && currentTermsPhase ? (
                  <div className="flex flex-col gap-1" data-e2e="application-current-terms">
                    <Text>
                      <CurrentTermsSummary terms={currentTerms} phase={currentTermsPhase} />
                    </Text>
                    {phase === 'Pending' && nextStart.kind === 'after' ? (
                      <Text size="sm" textColor="muted">
                        <Trans>
                          Approving renews them: the new terms start on{' '}
                          <DateTime date={nextStart.startsAt.toISOString()} variant="absolute" />,
                          when the existing terms end.
                        </Trans>
                      </Text>
                    ) : null}
                    {phase === 'Pending' && nextStart.kind === 'blocked' ? (
                      <Text size="sm" textColor="muted">
                        {nextStart.blocking !== currentTerms ? (
                          <Trans>
                            Terms scheduled from{' '}
                            <DateTime
                              date={getArrangementStart(nextStart.blocking)}
                              variant="absolute"
                            />{' '}
                            have no end date, so new terms would overlap them. To approve, withdraw
                            them or give them an end date on the{' '}
                            <Link to={billingAccountRoutes.detail(orgName, accountName)}>
                              billing account
                            </Link>
                            .
                          </Trans>
                        ) : currentTermsPhase === 'Scheduled' ? (
                          <Trans>
                            New terms would overlap these. To approve, withdraw them or give them an
                            end date on the{' '}
                            <Link to={billingAccountRoutes.detail(orgName, accountName)}>
                              billing account
                            </Link>
                            .
                          </Trans>
                        ) : (
                          <Trans>
                            New terms would overlap these. To approve, give them an end date on the{' '}
                            <Link to={billingAccountRoutes.detail(orgName, accountName)}>
                              billing account
                            </Link>
                            : the new terms then start that day.
                          </Trans>
                        )}
                      </Text>
                    ) : null}
                  </div>
                ) : (
                  <Text>
                    <Trans>None</Trans>
                  </Text>
                ),
            },
            {
              label: <Trans>Currency</Trans>,
              value: <Text>{currency || '—'}</Text>,
            },
            {
              label: <Trans>Billing contact</Trans>,
              value: (
                <Text>
                  {[account?.spec?.contactInfo?.name, account?.spec?.contactInfo?.email]
                    .filter(Boolean)
                    .join(' · ') || '—'}
                </Text>
              ),
            },
            {
              label: <Trans>Address</Trans>,
              value: (
                <Text className="whitespace-pre-line">
                  {formatBillingAddress(account?.spec?.contactInfo?.address) || '—'}
                </Text>
              ),
            },
          ]}
        />
      </SectionCard>

      <PaymentTermsFormDialog
        // Remount per application, and once the renewal date is known, so
        // the defaults reload.
        key={`${applicationName}-${renewsFrom?.toISOString() ?? ''}`}
        open={approveOpen}
        onOpenChange={setApproveOpen}
        title={t`Approve application`}
        description={t`Grants these payment terms to the billing account and approves the application. The customer can then pay by invoice.`}
        submitText={t`Approve`}
        currency={currency}
        defaultValues={paymentTermsFormFromApplication(application, { startsAt: renewsFrom })}
        showStart
        onSubmit={handleApprove}
      />

      <DeclineApplicationDialog
        open={declineOpen}
        onOpenChange={setDeclineOpen}
        onSubmit={handleDecline}
      />
    </div>
  );
}

/** "Net 30, active until 31 Dec 2026", or "…with no end date". */
function CurrentTermsSummary({
  terms,
  phase,
}: {
  terms: BillingArrangement;
  phase: BillingArrangementPhase;
}) {
  const netDays = terms.spec?.invoice?.netDays ?? '—';
  const endsAt = terms.spec?.endsAt;
  if (phase === 'Scheduled') {
    const start = <DateTime date={getArrangementStart(terms)} variant="absolute" />;
    return endsAt ? (
      <Trans>
        Net {netDays}, scheduled from {start} until <DateTime date={endsAt} variant="absolute" />.
      </Trans>
    ) : (
      <Trans>
        Net {netDays}, scheduled from {start} with no end date.
      </Trans>
    );
  }
  return endsAt ? (
    <Trans>
      Net {netDays}, active until <DateTime date={endsAt} variant="absolute" />.
    </Trans>
  ) : (
    <Trans>Net {netDays}, active with no end date.</Trans>
  );
}

type DeclineApplicationDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: DeclineApplicationFormValues) => Promise<void>;
};

export function DeclineApplicationDialog({
  open,
  onOpenChange,
  onSubmit,
}: DeclineApplicationDialogProps) {
  const { t } = useLingui();
  return (
    <DialogForm
      open={open}
      onOpenChange={onOpenChange}
      title={t`Decline application`}
      description={t`The customer sees your message in the cloud portal and can add a card or apply again.`}
      submitText={t`Decline`}
      cancelText={t`Cancel`}
      schema={declineApplicationFormSchema}
      defaultValues={emptyDeclineApplicationForm}
      onSubmit={onSubmit}>
      <Form.Field
        name="message"
        label={t`Message to the customer`}
        description={t`Shown to the customer. Say what they can do next. Up to ${MAX_DECLINE_MESSAGE_LENGTH} characters.`}
        required>
        <Form.Textarea
          rows={4}
          placeholder={t`For example: We couldn't verify your company. Reply to our email with your company registration number, or add a card to continue.`}
        />
      </Form.Field>
      <Form.Field
        name="internalNotes"
        label={t`Internal notes`}
        description={t`Why it was declined. Never shown to the customer.`}>
        <Form.Textarea rows={3} />
      </Form.Field>
    </DialogForm>
  );
}
