import {
  contractBillingDay,
  contractInvoiceDay,
  draftPublishProblem,
  getContractState,
  getDraftBillingDay,
  getDraftStartsAt,
  withDraftSnapshot,
  type DraftPublishProblem,
} from '../../lib/contract';
import { DEFAULT_SERVICE_PRICING_NAMESPACE } from '../../utils';
import { ContractFees, InvoicePreviewDialog } from './billing-account-contract-card';
import { InlineDate, PlanSection } from './card-parts';
import { DialogConfirm } from '@/components/dialog';
import {
  type ContractDraftPreview,
  useContractDraftQuery,
  useDiscardContractDraftMutation,
  usePublishContractDraftMutation,
  useServicePricingListQuery,
} from '@/resources/request/client';
import { ACTION_ICONS } from '@/utils/config/icons.config';
import { billingAccountRoutes } from '@/utils/config/routes.config';
import { Button, LinkButton } from '@datum-cloud/datum-ui/button';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { Skeleton } from '@datum-cloud/datum-ui/skeleton';
import { toast } from '@datum-cloud/datum-ui/toast';
import { Text } from '@datum-cloud/datum-ui/typography';
import { cn } from '@datum-cloud/datum-ui/utils';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import type {
  ComMiloapisBillingV1Alpha1BillingAccount,
  ComMiloapisBillingV1Alpha1BillingEntitlement,
} from '@openapi/billing.miloapis.com/v1alpha1';
import { FileSearch } from 'lucide-react';
import { useMemo, useState } from 'react';

/**
 * The account's draft contract, or draft change of its contract's fees:
 * saved from the contract editor, billing nothing until it's published.
 * Hidden when there's no draft.
 */
export function BillingAccountContractDraftCard({
  orgName,
  account,
  entitlement,
  now,
  readOnly = false,
}: {
  orgName: string;
  account: ComMiloapisBillingV1Alpha1BillingAccount;
  entitlement: ComMiloapisBillingV1Alpha1BillingEntitlement | null;
  now: Date;
  /** Shows the draft without ways to edit, publish or discard it. */
  readOnly?: boolean;
}) {
  const accountName = account.metadata?.name ?? '';
  const draftQuery = useContractDraftQuery(orgName, accountName);
  const pricingsQuery = useServicePricingListQuery(DEFAULT_SERVICE_PRICING_NAMESPACE);
  const publish = usePublishContractDraftMutation(orgName, accountName);
  const discard = useDiscardContractDraftMutation(orgName, accountName);
  const [confirm, setConfirm] = useState<'publish' | 'discard' | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const raw = draftQuery.data;
  const pricings = pricingsQuery.data?.items;
  const draft = useMemo(
    () => (raw && pricings ? withDraftSnapshot(raw, pricings) : null),
    [raw, pricings]
  );
  if (!raw) return null;

  const draftName = raw.metadata?.name ?? '';
  const contract = getContractState(entitlement, now);
  const startsAt = contract ? undefined : getDraftStartsAt(raw);
  // The day it bills on: the draft's for a new contract, the contract's for a change.
  const invoiceDay = contractInvoiceDay(
    contract ? contract.billingDay : getDraftBillingDay(raw),
    account.spec?.paymentTerms
  );
  const problem = draftPublishProblem(raw, entitlement, now);
  // A new contract's first invoice, once it could be published as it is.
  const preview: ContractDraftPreview | undefined =
    !contract && startsAt && !problem
      ? { offerName: draftName, startsAt, billingDay: getDraftBillingDay(raw) }
      : undefined;

  const run = async (action: 'publish' | 'discard') => {
    try {
      if (action === 'publish') {
        await publish.mutateAsync(draftName);
        toast.success(contract ? t`New contract fees published` : t`Contract published`);
      } else {
        await discard.mutateAsync(draftName);
        toast.success(t`Draft discarded`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t`Something went wrong. Try again.`);
      // DialogConfirm stays open on a throw; the toast says why.
      throw err;
    }
  };

  return (
    <PlanSection
      title={contract ? <Trans>Draft fee change</Trans> : <Trans>Draft contract</Trans>}
      action={
        readOnly ? undefined : (
          <LinkButton
            type="quaternary"
            theme="borderless"
            size="small"
            href={billingAccountRoutes.contract(orgName, accountName)}
            icon={<Icon icon={ACTION_ICONS.edit} size={14} />}
            iconPosition="right">
            <Trans>Edit</Trans>
          </LinkButton>
        )
      }>
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <Text size="sm" weight="medium">
            {contract ? (
              <Trans>New fees for the account&apos;s contract</Trans>
            ) : startsAt ? (
              <Trans>
                Starts{' '}
                <InlineDate
                  date={startsAt.toISOString()}
                  variant="absolute"
                  format="MMM d, yyyy"
                  timezone="UTC"
                />
              </Trans>
            ) : (
              <Trans>No start date yet</Trans>
            )}
          </Text>
          <Text size="xs" textColor="muted">
            {contract ? (
              contract.started ? (
                <Trans>Published, they apply from the account&apos;s next billing date.</Trans>
              ) : (
                <Trans>Published, they apply when the contract starts.</Trans>
              )
            ) : startsAt ? (
              invoiceDay ? (
                <Trans>
                  Bills on day {invoiceDay} of each month once published, with the first month
                  prorated.
                </Trans>
              ) : (
                <Trans>
                  Bills on day {contractBillingDay(startsAt)} of each month once published.
                </Trans>
              )
            ) : null}{' '}
            <Trans>Not published, so nothing is billed from it yet.</Trans>
          </Text>
        </div>

        {draft ? (
          <ContractFees
            offer={draft}
            startsAt={startsAt ?? contract?.startsAt}
            invoiceDay={invoiceDay}
          />
        ) : pricingsQuery.isLoading ? (
          <Skeleton className="h-10 w-full rounded" />
        ) : (
          <Text size="sm" textColor="muted">
            <Trans>Couldn&apos;t load the draft&apos;s fees.</Trans>
          </Text>
        )}

        {problem ? (
          <Text size="xs" textColor="warning">
            {publishProblemText(problem)}
          </Text>
        ) : null}

        <div className={cn('flex flex-wrap gap-2 border-t pt-3', readOnly && 'hidden')}>
          <Button
            size="small"
            disabled={Boolean(problem) || discard.isPending}
            onClick={() => setConfirm('publish')}>
            <Trans>Publish</Trans>
          </Button>
          <Button
            type="danger"
            theme="outline"
            size="small"
            disabled={publish.isPending}
            onClick={() => setConfirm('discard')}>
            <Trans>Discard</Trans>
          </Button>
          {preview ? (
            <Button
              type="secondary"
              theme="outline"
              size="small"
              className="ml-auto"
              icon={<Icon icon={FileSearch} size={14} />}
              onClick={() => setPreviewOpen(true)}>
              <Trans>Preview first invoice</Trans>
            </Button>
          ) : null}
        </div>
      </div>

      {preview && previewOpen ? (
        <InvoicePreviewDialog
          orgName={orgName}
          account={account}
          firstInvoice
          contractDraft={preview}
          onClose={() => setPreviewOpen(false)}
        />
      ) : null}

      <DialogConfirm
        open={confirm === 'publish'}
        onOpenChange={(open) => setConfirm(open ? 'publish' : null)}
        title={contract ? t`Publish the new fees?` : t`Publish the contract?`}
        description={
          contract
            ? contract.started
              ? t`The contract's fees change from the account's next billing date.`
              : t`The account moves onto these fees when the contract starts.`
            : t`The account moves onto the contract on its start date, when its charges start. A contract can't be removed or its start moved afterwards.`
        }
        confirmText={t`Publish`}
        onConfirm={() => run('publish')}
      />
      <DialogConfirm
        open={confirm === 'discard'}
        onOpenChange={(open) => setConfirm(open ? 'discard' : null)}
        title={t`Discard the draft?`}
        description={t`The draft and the prices made for it are deleted. The account's billing doesn't change.`}
        confirmText={t`Discard`}
        variant="destructive"
        onConfirm={() => run('discard')}
      />
    </PlanSection>
  );
}

const publishProblemText = (problem: DraftPublishProblem) => {
  switch (problem) {
    case 'no-start':
      return t`Pick a start date before publishing: edit the draft.`;
    case 'start-passed':
      return t`The start date has passed. Edit the draft to pick another.`;
    case 'start-too-far':
      return t`The start date is too far ahead. Edit the draft to pick another.`;
    case 'contract-exists':
      return t`The account is on a contract now, so this draft can't set one up. Edit it to change the contract's fees instead.`;
    case 'one-time-after-start':
      return t`The contract has started, so the draft's one-time fees would be charged again. Edit it to remove them.`;
  }
};
