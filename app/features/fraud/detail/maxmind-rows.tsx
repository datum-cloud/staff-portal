import type { MaxmindInsights } from './maxmind';
import { BadgeState } from '@/components/badge';
import { ButtonCopy } from '@/components/button';
import { DateTime } from '@/components/date';
import type { DescriptionListItem } from '@/components/description-list';
import { LinkButton } from '@datum-cloud/datum-ui/button';
import { Text } from '@datum-cloud/datum-ui/typography';
import { cn } from '@datum-cloud/datum-ui/utils';
import { Trans } from '@lingui/react/macro';
import { ExternalLinkIcon } from 'lucide-react';

function ipRiskColor(score: number | undefined): string {
  if (score == null) return '';
  if (score >= 75) return 'text-red-600 dark:text-red-400';
  if (score >= 25) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-green-600 dark:text-green-400';
}

// MaxMind reports common datacentre / proxy categories under user_type. We
// flag those visually so staff don't have to memorise the list.
const ELEVATED_USER_TYPES = new Set([
  'hosting',
  'cellular',
  'traveler',
  'business',
  'dialup',
  'public',
  'school',
  'router',
]);

function userTypeBadgeState(userType: string | undefined): string {
  if (!userType) return 'unknown';
  return ELEVATED_USER_TYPES.has(userType.toLowerCase()) ? 'warning' : 'info';
}

function formatLocation(insights: MaxmindInsights): string | null {
  const ip = insights.ip_address;
  const parts = [
    ip?.city?.names?.en,
    ip?.subdivisions?.[0]?.iso_code ?? ip?.subdivisions?.[0]?.names?.en,
    ip?.country?.names?.en ?? ip?.country?.iso_code,
  ].filter(Boolean);
  return parts.length ? parts.join(', ') : null;
}

export interface MaxmindRowGroups {
  network: DescriptionListItem[];
  location: DescriptionListItem[];
  email: DescriptionListItem[];
}

/**
 * Build MaxMind signal rows split into three logical groups so callers can
 * decide their own layout (two columns, separate cards, etc.). The function
 * returns only data rows — the caller is responsible for rendering section
 * titles (e.g. as a card header).
 *
 * Returns three empty arrays when there's nothing useful to show.
 */
export function buildMaxmindRowGroups(insights: MaxmindInsights | null): MaxmindRowGroups {
  const empty: MaxmindRowGroups = { network: [], location: [], email: [] };
  if (!insights) return empty;

  const ip = insights.ip_address;
  const traits = ip?.traits;
  const location = ip?.location;
  const email = insights.email;

  const hasIpBlock =
    !!traits?.ip_address ||
    !!traits?.network ||
    !!traits?.isp ||
    !!traits?.organization ||
    !!traits?.autonomous_system_number ||
    !!traits?.connection_type ||
    !!traits?.user_type ||
    typeof ip?.risk === 'number';

  const locationText = formatLocation(insights);
  const hasLocationBlock =
    !!locationText ||
    !!ip?.postal?.code ||
    typeof location?.latitude === 'number' ||
    !!location?.time_zone ||
    !!location?.local_time;

  const hasEmailBlock =
    !!traits?.domain || // ip-traits domain is the IP-side; email-side comes from email.domain
    !!email?.domain?.classification ||
    !!email?.first_seen ||
    !!email?.domain?.first_seen ||
    !!email?.is_disposable ||
    !!email?.is_high_risk ||
    !!email?.is_free ||
    !!email?.domain?.visit?.has_redirect;

  if (!hasIpBlock && !hasLocationBlock && !hasEmailBlock) return empty;

  const network: DescriptionListItem[] = [];
  const locationRows: DescriptionListItem[] = [];
  const emailRows: DescriptionListItem[] = [];

  // -------- IP & Network --------
  if (hasIpBlock) {
    network.push({
      key: 'mm-ip-address',
      label: <Trans>IP Address</Trans>,
      value: traits?.ip_address ? (
        <div className="flex items-center gap-2">
          <Text className="font-mono">{traits.ip_address}</Text>
          <ButtonCopy value={traits.ip_address} />
        </div>
      ) : null,
      hidden: !traits?.ip_address,
    });

    network.push({
      key: 'mm-network',
      label: <Trans>Network</Trans>,
      value: traits?.network ? <Text className="font-mono">{traits.network}</Text> : null,
      hidden: !traits?.network,
    });

    const ispLine = traits?.isp ?? traits?.organization;
    network.push({
      key: 'mm-isp',
      label: <Trans>ISP</Trans>,
      value: ispLine ? <Text>{ispLine}</Text> : null,
      hidden: !ispLine,
    });

    network.push({
      key: 'mm-asn',
      label: <Trans>ASN</Trans>,
      value: traits?.autonomous_system_number ? (
        <Text>
          AS{traits.autonomous_system_number}
          {traits.autonomous_system_organization
            ? ` — ${traits.autonomous_system_organization}`
            : ''}
        </Text>
      ) : null,
      hidden: !traits?.autonomous_system_number,
    });

    network.push({
      key: 'mm-connection',
      label: <Trans>Connection</Trans>,
      value: traits?.connection_type ? <Text>{traits.connection_type}</Text> : null,
      hidden: !traits?.connection_type,
    });

    network.push({
      key: 'mm-user-type',
      label: <Trans>User Type</Trans>,
      value: traits?.user_type ? (
        <BadgeState state={userTypeBadgeState(traits.user_type)} message={traits.user_type} />
      ) : null,
      hidden: !traits?.user_type,
    });

    network.push({
      key: 'mm-ip-risk',
      label: <Trans>IP Risk</Trans>,
      value:
        typeof ip?.risk === 'number' ? (
          <Text className={cn('font-mono font-medium', ipRiskColor(ip.risk))}>{ip.risk}</Text>
        ) : null,
      hidden: typeof ip?.risk !== 'number',
    });
  }

  // -------- Location --------
  if (hasLocationBlock) {
    locationRows.push({
      key: 'mm-location',
      label: <Trans>Location</Trans>,
      value: locationText ? <Text>{locationText}</Text> : null,
      hidden: !locationText,
    });

    locationRows.push({
      key: 'mm-postal',
      label: <Trans>Postal Code</Trans>,
      value: ip?.postal?.code ? <Text>{ip.postal.code}</Text> : null,
      hidden: !ip?.postal?.code,
    });

    locationRows.push({
      key: 'mm-coords',
      label: <Trans>Coordinates</Trans>,
      value:
        typeof location?.latitude === 'number' && typeof location?.longitude === 'number' ? (
          <LinkButton
            href={`https://www.openstreetmap.org/?mlat=${location.latitude}&mlon=${location.longitude}#map=10/${location.latitude}/${location.longitude}`}
            target="_blank"
            rel="noopener noreferrer"
            theme="outline"
            type="secondary"
            size="xs"
            icon={<ExternalLinkIcon size={14} />}
            iconPosition="right">
            {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
          </LinkButton>
        ) : null,
      hidden: typeof location?.latitude !== 'number' || typeof location?.longitude !== 'number',
    });

    locationRows.push({
      key: 'mm-timezone',
      label: <Trans>Timezone</Trans>,
      value: location?.time_zone ? <Text>{location.time_zone}</Text> : null,
      hidden: !location?.time_zone,
    });

    locationRows.push({
      key: 'mm-local-time',
      label: <Trans>Local Time</Trans>,
      value: location?.local_time ? (
        <Text>
          <DateTime date={location.local_time} variant="both" />
        </Text>
      ) : null,
      hidden: !location?.local_time,
    });
  }

  // -------- Email domain --------
  if (hasEmailBlock) {
    // Render the email-side domain only when MaxMind returned the domain
    // block. The IP-traits domain (`traits.domain`) is the network domain and
    // doesn't belong here.
    const domainName = traits?.domain ?? undefined;
    emailRows.push({
      key: 'mm-email-domain',
      label: <Trans>Domain</Trans>,
      value: domainName ? <Text>{domainName}</Text> : null,
      hidden: !domainName,
    });

    emailRows.push({
      key: 'mm-email-classification',
      label: <Trans>Classification</Trans>,
      value: email?.domain?.classification ? (
        <BadgeState state={email.domain.classification} message={email.domain.classification} />
      ) : null,
      hidden: !email?.domain?.classification,
    });

    emailRows.push({
      key: 'mm-email-first-seen',
      label: <Trans>Email First Seen</Trans>,
      value: email?.first_seen ? (
        <Text>
          <DateTime date={email.first_seen} variant="absolute" />
        </Text>
      ) : null,
      hidden: !email?.first_seen,
    });

    emailRows.push({
      key: 'mm-domain-first-seen',
      label: <Trans>Domain First Seen</Trans>,
      value: email?.domain?.first_seen ? (
        <Text>
          <DateTime date={email.domain.first_seen} variant="absolute" />
        </Text>
      ) : null,
      hidden: !email?.domain?.first_seen,
    });
  }

  return { network, location: locationRows, email: emailRows };
}
