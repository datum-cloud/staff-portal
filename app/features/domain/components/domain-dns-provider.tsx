import { Chip } from '@/components/chip';
import { ComDatumapisNetworkingV1AlphaDomain } from '@openapi/networking.datumapis.com/v1alpha';

// Extract nameservers type from OpenAPI generated type
type DomainStatus = NonNullable<ComDatumapisNetworkingV1AlphaDomain['status']>;
type DomainNameservers = DomainStatus['nameservers'];

export interface DomainDnsProvidersProps {
  nameservers?: DomainNameservers;
  maxVisible?: number;
  wrap?: boolean;
}

export const DomainDnsProviders = ({
  nameservers,
  maxVisible = 2,
  wrap = false,
}: DomainDnsProvidersProps) => {
  if (!nameservers?.length) return <>-</>;

  const registrantNames = Array.from(
    nameservers
      .reduce((acc, ns) => {
        ns?.ips?.forEach((ip) => {
          const name = ip?.registrantName?.trim();
          if (name) acc.set(name, true);
        });
        return acc;
      }, new Map<string, boolean>())
      .keys()
  );

  if (registrantNames.length === 0) return <>-</>;

  return <Chip items={registrantNames} maxVisible={maxVisible} variant="outline" wrap={wrap} />;
};
