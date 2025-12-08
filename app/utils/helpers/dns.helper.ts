import { DNSRecordFlattenedList, ExtendedControlPlaneStatus } from '@/resources/schemas';
import { transformControlPlaneStatus } from '@/utils/helpers/control-plane.helper';
import { ComMiloapisNetworkingDnsV1Alpha1DnsRecordSetList } from '@openapi/dns.networking.miloapis.com/v1alpha1';

export function flattenManagedRecordSets(
  records: ComMiloapisNetworkingDnsV1Alpha1DnsRecordSetList
): DNSRecordFlattenedList {
  const flattened = (records.items || []).flatMap((item) => {
    const { metadata, spec, status } = item;
    const recordType = spec?.recordType ?? '';
    const recordList = spec?.records ?? [];

    // Use unified transformer with DNS-specific options
    const statusInfo = transformControlPlaneStatus(status, {
      requiredConditions: ['Accepted', 'Programmed'],
      includeConditionDetails: true,
    });

    return flattenRecordEntries(recordType, recordList, {
      recordSetId: metadata?.uid ?? '',
      recordSetName: metadata?.name ?? '',
      createdAt: metadata?.creationTimestamp ?? new Date(),
      dnsZoneId: spec?.dnsZoneRef?.name ?? '',
      status: statusInfo,
    });
  });

  // Sort descending by createdAt (most recent first), then by name for same timestamp
  return flattened.sort((a, b) => {
    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    if (dateA !== dateB) {
      return dateB - dateA;
    }
    return a.name.localeCompare(b.name);
  });
}

function flattenRecordEntries(
  recordType: string,
  records: any[],
  metadata: {
    recordSetId?: string;
    recordSetName?: string;
    createdAt?: Date | string;
    dnsZoneId: string;
    status?: ExtendedControlPlaneStatus;
  }
): DNSRecordFlattenedList {
  const flattened: DNSRecordFlattenedList = [];

  records.forEach((record: any) => {
    const value = extractValue(record, recordType);
    const ttl = extractTTL(record);

    flattened.push({
      ...metadata,
      type: recordType,
      name: record.name || '',
      value: value,
      ttl: ttl,
      rawData: record,
    });
  });

  return flattened;
}

/**
 * Extract value from a record based on its type
 * Returns a single string value to be displayed in the UI
 * Reference: ComMiloapisNetworkingDnsV1Alpha1DnsRecordSet['spec']['records']
 */
export function extractValue(record: any, recordType: string | undefined): string {
  switch (recordType) {
    case 'A':
      // record.a.content: string (single value)
      return record.a?.content || '';

    case 'AAAA':
      // record.aaaa.content: string (single value)
      return record.aaaa?.content || '';

    case 'CNAME':
      // record.cname.content: string (single value)
      return record.cname?.content || '';

    case 'TXT':
      // record.txt.content: string (single value)
      return record.txt?.content || '';

    case 'NS':
      // record.ns.content: string (single value)
      return record.ns?.content || '';

    case 'PTR':
      // record.ptr.content: string (single value)
      return record.ptr?.content || '';

    case 'SOA':
      // record.soa: { mname, rname, refresh, retry, expire, serial, ttl }
      // Return as JSON string to preserve object structure for editing
      // Format will be applied in table cell renderer
      return record.soa ? JSON.stringify(record.soa) : '';

    case 'MX':
      // record.mx: { exchange: string, preference: number } (single object)
      // Format: "preference|exchange" (pipe separator for UI parsing)
      return record.mx ? `${record.mx.preference}|${record.mx.exchange}` : '';

    case 'SRV':
      // record.srv: { priority, weight, port, target } (single object)
      // Format: "priority weight port target"
      return record.srv
        ? `${record.srv.priority} ${record.srv.weight} ${record.srv.port} ${record.srv.target}`
        : '';

    case 'CAA':
      // record.caa: { flag, tag, value } (single object)
      // Format: "flag tag value"
      return record.caa ? `${record.caa.flag} ${record.caa.tag} "${record.caa.value}"` : '';

    case 'TLSA':
      // record.tlsa: { usage, selector, matchingType, certData } (single object)
      // Format: "usage selector matchingType certData"
      return record.tlsa
        ? `${record.tlsa.usage} ${record.tlsa.selector} ${record.tlsa.matchingType} ${record.tlsa.certData}`
        : '';

    case 'HTTPS':
      // record.https: { priority, target, params } (single object)
      // Format: "priority target [params]"
      if (!record.https) return '';
      const httpsParams = record.https.params
        ? ` ${Object.entries(record.https.params)
            .map(([k, v]) => `${k}=${v}`)
            .join(' ')}`
        : '';
      return `${record.https.priority} ${record.https.target}${httpsParams}`;

    case 'SVCB':
      // record.svcb: { priority, target, params } (single object)
      // Format: "priority target [params]"
      if (!record.svcb) return '';
      const svcbParams = record.svcb.params
        ? ` ${Object.entries(record.svcb.params)
            .map(([k, v]) => `${k}=${v}`)
            .join(' ')}`
        : '';
      return `${record.svcb.priority} ${record.svcb.target}${svcbParams}`;

    default:
      // Fallback to content if available
      return record.content || '';
  }
}

/**
 * Extract TTL from record
 * Handles both bigint and number types, converting bigint to number for UI display
 */
function extractTTL(record: any): number | undefined {
  // TTL can be bigint or number in the new schema
  if (record.ttl !== undefined && record.ttl !== null) {
    // Convert bigint to number if needed
    return typeof record.ttl === 'bigint' ? Number(record.ttl) : record.ttl;
  }

  return undefined;
}

export function formatTTL(ttlSeconds?: number): string {
  if (!ttlSeconds) return 'Auto';

  const days = Math.floor(ttlSeconds / 86400);
  const hours = Math.floor((ttlSeconds % 86400) / 3600);
  const minutes = Math.floor((ttlSeconds % 3600) / 60);
  const seconds = ttlSeconds % 60;

  const parts: string[] = [];

  if (days > 0) parts.push(`${days} day${days > 1 ? 's' : ''}`);
  if (hours > 0) parts.push(`${hours} hr${hours > 1 ? 's' : ''}`);
  if (minutes > 0) parts.push(`${minutes} min${minutes > 1 ? 's' : ''}`);
  if (seconds > 0 && parts.length === 0) parts.push(`${seconds} sec${seconds > 1 ? 's' : ''}`);

  // Return first two most significant units
  return parts.slice(0, 2).join(' ');
}
