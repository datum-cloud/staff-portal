import { Chip } from '@/components/chip';
import { ComMiloapisNetworkingDnsV1Alpha1DnsZone } from '@openapi/dns.networking.miloapis.com/v1alpha1';

// Extract nameserver type from OpenAPI generated type
type DnsZoneStatus = NonNullable<ComMiloapisNetworkingDnsV1Alpha1DnsZone['status']>;
type DnsZoneDomainRef = NonNullable<DnsZoneStatus['domainRef']>;
type DnsZoneDomainRefStatus = NonNullable<DnsZoneDomainRef['status']>;
type DnsZoneNameserver = NonNullable<DnsZoneDomainRefStatus['nameservers']>[number];
type DnsZoneNameserverIp = NonNullable<DnsZoneNameserver['ips']>[number];

/**
 * Helper function to extract unique registrant names (DNS host providers)
 * from nameservers or IPs data
 */
const extractRegistrantNames = (
  data: DnsZoneNameserver[] | DnsZoneNameserverIp[] | undefined
): string[] => {
  if (!data?.length) return [];

  // Type guard to determine if data is nameservers or IPs
  const isNameservers = (
    d: DnsZoneNameserver[] | DnsZoneNameserverIp[]
  ): d is DnsZoneNameserver[] => {
    return Array.isArray(d) && d.length > 0 && 'hostname' in d[0];
  };

  const nameMap = new Map<string, boolean>();

  if (isNameservers(data)) {
    // Process full nameservers array
    data.forEach((ns) => {
      ns?.ips?.forEach((ip) => {
        const name = ip?.registrantName?.trim();
        if (name) nameMap.set(name, true);
      });
    });
  } else {
    // Process IPs array directly
    data.forEach((ip) => {
      const name = ip?.registrantName?.trim();
      if (name) nameMap.set(name, true);
    });
  }

  return Array.from(nameMap.keys());
};

export interface DnsHostChipsProps {
  data?: DnsZoneNameserver[] | DnsZoneNameserverIp[];
  maxVisible?: number;
  wrap?: boolean;
  emptyText?: string;
}

/**
 * Display DNS host provider names as chips
 * Extracts registrant names from nameserver or IP data
 */
export const DnsHostChips = ({
  data,
  maxVisible = 2,
  wrap = false,
  emptyText = '-',
}: DnsHostChipsProps) => {
  const registrantNames = extractRegistrantNames(data);

  if (registrantNames.length === 0) return <>{emptyText}</>;

  return <Chip items={registrantNames} maxVisible={maxVisible} variant="outline" wrap={wrap} />;
};
