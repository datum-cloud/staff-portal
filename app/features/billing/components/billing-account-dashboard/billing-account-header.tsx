import { getBillingMode } from '../../lib/payment-terms';
import { getBillingAccountDisplayName, type BillingAccount } from '../../utils';
import { AccountStatusBadge } from './account-status-badge';
import { InlineDate } from './card-parts';
import { ButtonCopy } from '@/components/button';
import { PageHeader } from '@/components/page-header';
import { ACTION_ICONS, ENTITY_ICONS } from '@/utils/config/icons.config';
import { orgRoutes } from '@/utils/config/routes.config';
import { Button } from '@datum-cloud/datum-ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@datum-cloud/datum-ui/dropdown';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { Text } from '@datum-cloud/datum-ui/typography';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import {
  CalendarDays,
  ChevronDown,
  Coins,
  CreditCard,
  FileSearch,
  FileText,
  Hash,
  Plus,
} from 'lucide-react';
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
  account: BillingAccount;
  cloudPortalUrl?: string | null;
  /** Items for the More menu, above its links to the organization and Cloud Portal. */
  actions?: BillingAccountHeaderAction[];
  /** Opens the add charge dialog; unset when the account can't take charges. */
  onAddCharge?: () => void;
  /** Opens the next-invoice preview; unset when there's none to show. */
  onPreviewInvoice?: () => void;
  /** Whether the preview is of a contract's first invoice. */
  previewsFirstInvoice?: boolean;
}

function MetaItem({ icon, children }: { icon: typeof Hash; children: ReactNode }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5">
      <Icon icon={icon} size={14} className="text-icon-quaternary shrink-0" aria-hidden />
      {children}
    </span>
  );
}

function BilledBy({ account }: { account: BillingAccount }) {
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
  onAddCharge,
  onPreviewInvoice,
  previewsFirstInvoice = false,
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
        // What staff do most sits out as buttons; the rest, and the links
        // away from the page, are in the menu.
        <>
          {onPreviewInvoice ? (
            <Button
              type="secondary"
              theme="outline"
              icon={<Icon icon={FileSearch} size={14} />}
              onClick={onPreviewInvoice}>
              {previewsFirstInvoice ? (
                <Trans>Preview first invoice</Trans>
              ) : (
                <Trans>Preview next invoice</Trans>
              )}
            </Button>
          ) : null}
          {onAddCharge ? (
            <Button
              type="secondary"
              theme="solid"
              icon={<Icon icon={Plus} size={14} />}
              onClick={onAddCharge}>
              <Trans>Add charge</Trans>
            </Button>
          ) : null}
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button
                type="secondary"
                theme="outline"
                icon={<Icon icon={ChevronDown} size={14} />}
                iconPosition="right">
                <Trans>More</Trans>
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
              {actions.length > 0 ? <DropdownMenuSeparator /> : null}
              <DropdownMenuItem asChild>
                <Link to={orgRoutes.detail(orgName)}>
                  <Trans>View organization</Trans>
                </Link>
              </DropdownMenuItem>
              {cloudPortalUrl ? (
                <DropdownMenuItem asChild>
                  <a href={cloudPortalUrl} target="_blank" rel="noreferrer">
                    <Trans>Open in Cloud Portal</Trans>
                    <ACTION_ICONS.externalLink className="size-3.5" />
                  </a>
                </DropdownMenuItem>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      }
    />
  );
}
