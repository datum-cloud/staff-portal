/**
 * Human-readable labels for each tool name, shown in the tool indicator
 * while a call is in flight. Safe for both client and server import.
 */
const TOOL_LABELS: Record<string, string> = {
  search_resources: 'Searching resources...',
  list_users: 'Listing users...',
  get_user: 'Looking up user...',
  list_organizations: 'Listing organizations...',
  get_organization: 'Looking up organization...',
  list_projects: 'Listing projects...',
  get_project: 'Looking up project...',
  list_fraud_evaluations: 'Listing fraud evaluations...',
  get_fraud_evaluation: 'Looking up fraud evaluation...',
  list_contacts: 'Listing contacts...',
  list_contact_groups: 'Listing contact groups...',
  list_emails: 'Listing emails...',
  list_email_broadcasts: 'Listing email broadcasts...',
  query_audit_logs: 'Querying audit logs...',
  get_resource_count: 'Counting resources...',
};

export function getToolLabel(toolName: string): string {
  return TOOL_LABELS[toolName] ?? `Calling ${toolName}...`;
}
