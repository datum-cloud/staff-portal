// Hand-written types for support.miloapis.com/v1alpha1 resources.
// Run the OpenAPI generator against the support API server to replace this with
// auto-generated types.

export interface IoK8sApimachineryPkgApisMetaV1ObjectMeta {
  name?: string;
  generateName?: string;
  namespace?: string;
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
  resourceVersion?: string;
  uid?: string;
  creationTimestamp?: string;
  deletionTimestamp?: string;
}

export interface IoK8sApimachineryPkgApisMetaV1ListMeta {
  continue?: string;
  remainingItemCount?: number;
  resourceVersion?: string;
  selfLink?: string;
}

export interface ComMiloApisSupportV1Alpha1UserReference {
  name: string;
  displayName?: string;
  email?: string;
}

export interface ComMiloApisSupportV1Alpha1ObjectReference {
  kind: string;
  name: string;
}

export interface ComMiloApisSupportV1Alpha1TicketParticipant {
  userRef: ComMiloApisSupportV1Alpha1UserReference;
  addedAt?: string;
}

export interface ComMiloApisSupportV1Alpha1SupportTicketSpec {
  title: string;
  description: string;
  status?: 'open' | 'in-progress' | 'waiting-on-customer' | 'resolved' | 'closed';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  ownerRef?: ComMiloApisSupportV1Alpha1UserReference;
  contributors?: ComMiloApisSupportV1Alpha1UserReference[];
  participants?: ComMiloApisSupportV1Alpha1TicketParticipant[];
  tags?: string[];
  visibility?: string;
  organizationRef?: ComMiloApisSupportV1Alpha1ObjectReference;
  reporterRef: ComMiloApisSupportV1Alpha1UserReference;
}

export interface ComMiloApisSupportV1Alpha1SupportTicketStatus {
  phase?: string;
  messageCount?: number;
  lastActivity?: string;
  /** Maps principal name → ISO timestamp of last read. */
  readState?: Record<string, string>;
  conditions?: Array<{
    type: string;
    status: string;
    reason?: string;
    message?: string;
    lastTransitionTime?: string;
  }>;
}

export interface ComMiloApisSupportV1Alpha1SupportTicket {
  apiVersion?: string;
  kind?: string;
  metadata?: IoK8sApimachineryPkgApisMetaV1ObjectMeta;
  spec: ComMiloApisSupportV1Alpha1SupportTicketSpec;
  status?: ComMiloApisSupportV1Alpha1SupportTicketStatus;
}

export interface ComMiloApisSupportV1Alpha1SupportTicketList {
  apiVersion?: string;
  kind?: string;
  metadata?: IoK8sApimachineryPkgApisMetaV1ListMeta;
  items: ComMiloApisSupportV1Alpha1SupportTicket[];
}

export interface ComMiloApisSupportV1Alpha1SupportMessageSpec {
  ticketRef: string;
  body: string;
  authorRef: ComMiloApisSupportV1Alpha1UserReference;
  authorType: 'staff' | 'customer';
  internal?: boolean;
}

export interface ComMiloApisSupportV1Alpha1SupportMessageStatus {
  createdAt?: string;
  updatedAt?: string;
}

export interface ComMiloApisSupportV1Alpha1SupportMessage {
  apiVersion?: string;
  kind?: string;
  metadata?: IoK8sApimachineryPkgApisMetaV1ObjectMeta;
  spec: ComMiloApisSupportV1Alpha1SupportMessageSpec;
  status?: ComMiloApisSupportV1Alpha1SupportMessageStatus;
}

export interface ComMiloApisSupportV1Alpha1SupportMessageList {
  apiVersion?: string;
  kind?: string;
  metadata?: IoK8sApimachineryPkgApisMetaV1ListMeta;
  items: ComMiloApisSupportV1Alpha1SupportMessage[];
}

export interface ComMiloApisSupportV1Alpha1KnowledgeBaseEntrySpec {
  title: string;
  body: string;
  topic?: string;
  tags?: string[];
  authorRef: ComMiloApisSupportV1Alpha1UserReference;
  sourceMessageRef?: string;
}

export interface ComMiloApisSupportV1Alpha1KnowledgeBaseEntryStatus {
  createdAt?: string;
  updatedAt?: string;
}

export interface ComMiloApisSupportV1Alpha1KnowledgeBaseEntry {
  apiVersion?: string;
  kind?: string;
  metadata?: IoK8sApimachineryPkgApisMetaV1ObjectMeta;
  spec: ComMiloApisSupportV1Alpha1KnowledgeBaseEntrySpec;
  status?: ComMiloApisSupportV1Alpha1KnowledgeBaseEntryStatus;
}

export interface ComMiloApisSupportV1Alpha1KnowledgeBaseEntryList {
  apiVersion?: string;
  kind?: string;
  metadata?: IoK8sApimachineryPkgApisMetaV1ListMeta;
  items: ComMiloApisSupportV1Alpha1KnowledgeBaseEntry[];
}
