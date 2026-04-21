import { createActivityClientConfig } from '@/features/activity/lib/activity-client';
import { AuditLogQueryComponent, ActivityApiClient } from '@datum-cloud/activity-ui';

// Create client with proxy URL - no loader needed
const clientConfig = createActivityClientConfig();

/**
 * Audit Logs Tab
 */
export default function AuditLogsPage() {
  // Initialize client in browser with proxy URL
  const client = new ActivityApiClient(clientConfig);

  return <AuditLogQueryComponent client={client} className="bg-card border-border border" />;
}
