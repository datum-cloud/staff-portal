import { getBillingMode } from '../../lib/payment-terms';
import { getBillingAccountDisplayName } from '../../utils';
import { AccountStatusBadge } from './account-status-badge';
import { InlineDate } from './card-parts';
import { ButtonCopy } from '@/components/button';
import { PageHeader } from '@/components/page-header';
import { ACTION_ICONS, ENTITY_ICONS } from '@/utils/config/icons.config';
import { orgRoutes } from '@/utils/config/routes.config';
import { Button, LinkButton } from '@datum-cloud/datum-ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@datum-cloud/datum-ui/dropdown';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { Text } from '@datum-cloud/datum-ui/typography';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import type { ComMiloapisBillingV1Alpha1BillingAccount } from '@openapi/billing.miloapis.com/v1alpha1';
import { CalendarDays, ChevronDown, Coins, CreditCard, FileText, Hash } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';

export interface BillingAccountHeaderAction {
  key: string;
  label: ReactNode;
  onSelect: () => void;
  disabled?: boolean;
}

interface BillingAccountHeaderProps {
  orgName: string;
  orgDisplayName: string;
  account: ComMiloapisBillingV1Alpha1BillingAccount;
  cloudPortalUrl?: string | null;
  /** Items for the Actions menu; the menu is hidden when there are none. */
  actions?: BillingAccountHeaderAction[];
}

function MetaItem({ icon, children }: { icon: typeof Hash; children: ReactNode }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5">
      <Icon icon={icon} size={14} className="text-icon-quaternary shrink-0" aria-hidden />
      {children}
    </span>
  );
}

function BilledBy({ account }: { account: ComMiloapisBillingV1Alpha1BillingAccount }) {
  const mode = getBillingMode(account);
  if (mode === 'invoice') {
    return (
      <MetaItem icon={FileText}>
        <Trans>Billed by invoice</Trans>
      </MetaItem>
    );
  }
  if (mode === 'card') {
    return (
      <MetaItem icon={CreditCard}>
        <Trans>Pays by card</Trans>
      </MetaItem>
    );
  }
  return null;
}

export function BillingAccountHeader({
  orgName,
  orgDisplayName,
  account,
  cloudPortalUrl,
  actions = [],
}: BillingAccountHeaderProps) {
  const accountName = account.metadata?.name ?? '';

  return (
    <PageHeader
      title={
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate">{getBillingAccountDisplayName(account)}</span>
          <AccountStatusBadge orgName={orgName} account={account} />
        </span>
      }
      description={
        <Text
          as="span"
          size="sm"
          textColor="muted"
          className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <MetaItem icon={ENTITY_ICONS.organization}>
            <Link to={orgRoutes.detail(orgName)} className="text-primary hover:underline">
              {orgDisplayName || orgName}
            </Link>
          </MetaItem>
          <MetaItem icon={Hash}>
            <Text as="span" size="xs" className="font-mono">
              {accountName}
            </Text>
            <ButtonCopy value={accountName} />
          </MetaItem>
          {account.spec?.currencyCode ? (
            <MetaItem icon={Coins}>{account.spec.currencyCode}</MetaItem>
          ) : null}
          <BilledBy account={account} />
          {account.metadata?.creationTimestamp ? (
            <MetaItem icon={CalendarDays}>
              <Trans>
                Created{' '}
                <InlineDate
                  date={account.metadata.creationTimestamp}
                  variant="absolute"
                  format="MMM d, yyyy"
                />
              </Trans>
            </MetaItem>
          ) : null}
        </Text>
      }
      actions={
        <>
          <LinkButton type="secondary" theme="outline" href={orgRoutes.detail(orgName)}>
            <Trans>View organization</Trans>
          </LinkButton>
          {cloudPortalUrl ? (
            <LinkButton
              type="secondary"
              theme="outline"
              href={cloudPortalUrl}
              target="_blank"
              rel="noreferrer"
              icon={<ACTION_ICONS.externalLink className="size-4" />}
              iconPosition="right">
              <Trans>Open in Cloud Portal</Trans>
            </LinkButton>
          ) : null}
          {actions.length > 0 ? (
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <Button
                  type="secondary"
                  theme="solid"
                  icon={<Icon icon={ChevronDown} size={14} />}
                  iconPosition="right">
                  <Trans>Actions</Trans>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {actions.map((action) => (
                  <DropdownMenuItem
                    key={action.key}
                    disabled={action.disabled}
                    onClick={action.onSelect}>
                    {action.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </>
      }
    />
  );
}
