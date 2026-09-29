export type Scalars = {
  ID: string;
  String: string;
  Int: number;
  Boolean: boolean;
};

export interface Query {
  /**
   * Lists ServiceConsumers in the given producer project, enriched with each
   * consumer project's human-readable display name (the
   * kubernetes.io/description annotation on the Project, falling back to the
   * project name).
   *
   * Authorization uses the caller's bearer token for both the consumer list
   * (in the producer project's control plane) and the per-project lookups (at
   * the core resourcemanager API). A list failure returns an empty list; a
   * per-project lookup failure degrades that row to the raw project name.
   *
   * serviceNames, when given, keeps only consumers whose spec.serviceRef.name
   * matches one of them. Filtering happens before enrichment, so project and
   * organization lookups run only for the consumers that are returned.
   */
  serviceConsumers: ServiceConsumer[];
  /**
   * Returns sessions for the authenticated caller by default.
   *
   * When userID is provided and differs from the caller, the request is
   * forwarded to milo with a status.userUID field selector. milo authorizes
   * the cross-user lookup via SubjectAccessReview against
   * iam.miloapis.com/users/<userID> — callers without that permission get
   * an empty list (the underlying 403 is logged).
   */
  sessions: ExtendedSession[];
  /**
   * Lists ContactGroupMemberships across all namespaces, enriched with full
   * Contact data for each membership. Resolves all contacts in parallel.
   * fieldSelector supports standard Kubernetes field selectors.
   */
  contactGroupMembershipsWithContacts: EnrichedContactGroupMembershipList;
  /**
   * Lists ContactGroupMemberships in the given namespace, enriched with full
   * ContactGroup data for each membership. Resolves all contact groups in parallel.
   */
  contactMembershipsWithGroups: EnrichedContactMembershipList;
  /**
   * Batch-fetches User summaries by name. Fetches run in parallel; individual
   * lookup failures return null for that entry (filtered from the result).
   */
  userSummaries: UserSummary[];
  /**
   * Lists users (iam.miloapis.com) with each user's latest fraud score joined in.
   * `search` is an exact email match (spec.email); `platformAccess` filters on
   * status.platformAccess. Paginate with `limit` / `cursor`.
   */
  users: UserList;
  /**
   * Lists all organizations the caller can access. When `search` is set, matches
   * substring against name, displayName, company, and contact fields (walks
   * upstream pages until `limit` matches).
   */
  organizations: OrganizationList;
  /** Returns a single organization by name. */
  organization?: Organization;
  /** Lists projects in an organization via its control plane. */
  organizationProjects: ProjectList;
  /** Lists members and pending invitations for an organization. */
  organizationMembers: OrgMember[];
  /** Lists all projects the caller can access. */
  projects: ProjectList;
  /** Returns a single project by name. */
  project?: Project;
  /** Enriched quota buckets for an org — joins AllowanceBuckets with ResourceRegistrations server-side. */
  orgQuotaBuckets: QuotaBucketList;
  /** Enriched quota buckets for a project — joins AllowanceBuckets with ResourceRegistrations server-side. */
  projectQuotaBuckets: QuotaBucketList;
  /** Enriched resource grants for an org with flattened, display-enriched allowances. */
  orgQuotaGrants: QuotaGrantList;
  /** Enriched resource grants for a project with flattened, display-enriched allowances. */
  projectQuotaGrants: QuotaGrantList;
  __typename: 'Query';
}

export interface ParsedUserAgent {
  browser?: Scalars['String'];
  os?: Scalars['String'];
  formatted: Scalars['String'];
  __typename: 'ParsedUserAgent';
}

export interface GeoLocation {
  city?: Scalars['String'];
  country?: Scalars['String'];
  countryCode?: Scalars['String'];
  formatted: Scalars['String'];
  __typename: 'GeoLocation';
}

export interface ExtendedSession {
  id: Scalars['String'];
  userUID: Scalars['String'];
  provider: Scalars['String'];
  ipAddress?: Scalars['String'];
  fingerprintID?: Scalars['String'];
  createdAt: Scalars['String'];
  lastUpdatedAt?: Scalars['String'];
  userAgent?: ParsedUserAgent;
  location?: GeoLocation;
  __typename: 'ExtendedSession';
}

export interface ConsumerProject {
  /** The project's machine name (metadata.name). */
  name: Scalars['String'];
  /** Human-readable name from the kubernetes.io/display-name annotation, falling back to kubernetes.io/description, then name. */
  displayName: Scalars['String'];
  /** The owning organization's machine name (spec.ownerRef.name). */
  organizationName: Scalars['String'];
  /** Owning organization's display name (kubernetes.io/display-name), falling back to organizationName. */
  organizationDisplayName: Scalars['String'];
  __typename: 'ConsumerProject';
}

export interface ServiceConsumer {
  /** The ServiceConsumer's name (metadata.name). */
  name: Scalars['String'];
  /** The referenced service (spec.serviceRef.name), used by callers to filter by service. */
  serviceName?: Scalars['String'];
  /** Lifecycle phase (status.phase), e.g. Active, PendingApproval. */
  phase?: Scalars['String'];
  /** Approval decision (spec.approval.decision), e.g. Approved, Denied. */
  approvalDecision?: Scalars['String'];
  /** Optional approval note (spec.approval.message). */
  approvalMessage?: Scalars['String'];
  /** When the consumer was requested (metadata.creationTimestamp). */
  requestedAt?: Scalars['String'];
  /** The consuming project, enriched with its display name. */
  consumerProject: ConsumerProject;
  __typename: 'ServiceConsumer';
}

export interface ContactRef {
  name: Scalars['String'];
  namespace: Scalars['String'];
  __typename: 'ContactRef';
}

export interface EnrichedContact {
  name: Scalars['String'];
  namespace: Scalars['String'];
  email?: Scalars['String'];
  givenName?: Scalars['String'];
  familyName?: Scalars['String'];
  displayName?: Scalars['String'];
  __typename: 'EnrichedContact';
}

/** A single Kubernetes-style status condition on a ContactGroup. */
export interface ContactGroupCondition {
  type: Scalars['String'];
  status: Scalars['String'];
  reason?: Scalars['String'];
  message?: Scalars['String'];
  lastTransitionTime?: Scalars['String'];
  observedGeneration?: Scalars['Int'];
  __typename: 'ContactGroupCondition';
}

export interface EnrichedContactGroupStatus {
  conditions?: ContactGroupCondition[];
  __typename: 'EnrichedContactGroupStatus';
}

export interface EnrichedContactGroup {
  name: Scalars['String'];
  namespace: Scalars['String'];
  displayName?: Scalars['String'];
  /** Whether the group allows opt-in/opt-out membership: 'public' or 'private'. */
  visibility?: Scalars['String'];
  /** Observed status of the ContactGroup (Ready condition, provider sync). */
  status?: EnrichedContactGroupStatus;
  __typename: 'EnrichedContactGroup';
}

export interface ContactGroupMembershipEnriched {
  /** metadata.name of the ContactGroupMembership resource. */
  name: Scalars['String'];
  contactRef: ContactRef;
  /** Full Contact data, null if lookup failed. */
  contact?: EnrichedContact;
  __typename: 'ContactGroupMembershipEnriched';
}

export interface ContactMembershipEnriched {
  /** metadata.name of the ContactGroupMembership resource. */
  name: Scalars['String'];
  /** When the contact joined the group (membership metadata.creationTimestamp). */
  creationTimestamp?: Scalars['String'];
  contactGroupRef: ContactRef;
  /** Full ContactGroup data, null if lookup failed. */
  contactGroup?: EnrichedContactGroup;
  __typename: 'ContactMembershipEnriched';
}

export interface EnrichedContactGroupMembershipList {
  items: ContactGroupMembershipEnriched[];
  /** Kubernetes continue token for pagination. */
  continue?: Scalars['String'];
  __typename: 'EnrichedContactGroupMembershipList';
}

export interface EnrichedContactMembershipList {
  items: ContactMembershipEnriched[];
  continue?: Scalars['String'];
  __typename: 'EnrichedContactMembershipList';
}

export interface UserSummary {
  /** metadata.name of the User resource. */
  name: Scalars['String'];
  email?: Scalars['String'];
  givenName?: Scalars['String'];
  familyName?: Scalars['String'];
  __typename: 'UserSummary';
}

export interface User {
  /** metadata.name — the stable user ID. */
  name: Scalars['String'];
  uid?: Scalars['String'];
  resourceVersion?: Scalars['String'];
  email?: Scalars['String'];
  givenName?: Scalars['String'];
  familyName?: Scalars['String'];
  createdAt?: Scalars['String'];
  /** preferences/theme annotation. */
  theme?: Scalars['String'];
  /** preferences/timezone annotation. */
  timezone?: Scalars['String'];
  /** preferences/newsletter annotation parsed to boolean. */
  newsletter?: Scalars['Boolean'];
  /** onboarding/completedAt annotation. */
  onboardedAt?: Scalars['String'];
  registrationApproval?: Scalars['String'];
  state?: Scalars['String'];
  avatarUrl?: Scalars['String'];
  lastLoginProvider?: Scalars['String'];
  nameReviewRequired?: Scalars['Boolean'];
  /** status.platformAccess — the platform access state. */
  platformAccess?: Scalars['String'];
  /** Latest fraud evaluation score — status.compositeScore (0-100). Null when never evaluated. */
  fraudScore?: Scalars['String'];
  /** Latest fraud decision — ACCEPTED | REVIEW | DEACTIVATE. */
  fraudDecision?: Scalars['String'];
  /** Latest fraud evaluation time (ISO 8601). */
  fraudEvaluatedAt?: Scalars['String'];
  __typename: 'User';
}

export interface UserList {
  items: User[];
  continueToken?: Scalars['String'];
  __typename: 'UserList';
}

export interface OrgContactInfo {
  /** Legal / company name from spec.contactInfo.businessName. */
  businessName?: Scalars['String'];
  /** Primary contact name from spec.contactInfo.name. */
  name?: Scalars['String'];
  /** Primary contact email from spec.contactInfo.email. */
  email?: Scalars['String'];
  __typename: 'OrgContactInfo';
}

export interface Organization {
  /** metadata.name — the stable organization ID. */
  name: Scalars['String'];
  /** Human-readable name from the kubernetes.io/display-name annotation, falling back to name. */
  displayName: Scalars['String'];
  /** Organization type: Personal or Standard. */
  type: Scalars['String'];
  createdAt?: Scalars['String'];
  /** Status of the Ready condition. */
  state?: Scalars['String'];
  /** Contact details from spec.contactInfo. */
  contactInfo?: OrgContactInfo;
  /** True when the OnboardingComplete condition status is True. */
  onboardingComplete: Scalars['Boolean'];
  /** Reason from the OnboardingComplete condition. */
  onboardingReason?: Scalars['String'];
  /** Human-readable message from the OnboardingComplete condition. */
  onboardingMessage?: Scalars['String'];
  /** Members and pending invitations for this organization. */
  members: OrgMember[];
  /** Projects owned by this organization (via its control plane). */
  projects: ProjectList;
  __typename: 'Organization';
}

export interface OrganizationList {
  items: Organization[];
  /** Pagination cursor — pass as cursor on the next call to continue listing. */
  continueToken?: Scalars['String'];
  __typename: 'OrganizationList';
}

export interface Project {
  /** metadata.name — the stable project ID. */
  name: Scalars['String'];
  /** Human-readable name from the kubernetes.io/display-name annotation, falling back to kubernetes.io/description, then name. */
  displayName: Scalars['String'];
  /** Name of the owning organization. */
  organizationName: Scalars['String'];
  /** Owning organization's display name (kubernetes.io/display-name), falling back to organizationName. */
  organizationDisplayName: Scalars['String'];
  /** Owning organization's company / legal name from contactInfo.businessName. */
  organizationBusinessName?: Scalars['String'];
  /** True when the project has an Active billing-account binding to an account with a default payment method. */
  hasActiveBillingAccount: Scalars['Boolean'];
  /** Bound billing account name when hasActiveBillingAccount is true. */
  billingAccountName?: Scalars['String'];
  createdAt?: Scalars['String'];
  /** Status of the Ready condition. */
  state?: Scalars['String'];
  /** metadata.deletionTimestamp — set while the project is terminating. */
  deletionTimestamp?: Scalars['String'];
  /** Unparsed ResourceCleanup condition message naming what deletion is waiting on. */
  resourceCleanupMessage?: Scalars['String'];
  __typename: 'Project';
}

export interface ProjectList {
  items: Project[];
  /** Pagination cursor — pass as cursor on the next call to continue listing. */
  continueToken?: Scalars['String'];
  __typename: 'ProjectList';
}

export interface OrgMember {
  /** Resource name of the membership or invitation. */
  name: Scalars['String'];
  givenName?: Scalars['String'];
  familyName?: Scalars['String'];
  email: Scalars['String'];
  roles: Scalars['String'][];
  /** member or invitation */
  type: Scalars['String'];
  /** Only set for invitations: Pending, Accepted, Declined. */
  invitationState?: Scalars['String'];
  createdAt?: Scalars['String'];
  /** The member's user resource name. Null for invitations, which have no user yet. */
  userName?: Scalars['String'];
  /** Avatar URL from the membership user status. Null for invitations. */
  avatarUrl?: Scalars['String'];
  __typename: 'OrgMember';
}

export interface QuotaBucket {
  /** metadata.name */
  name: Scalars['String'];
  /** metadata.namespace (needed for grant creation) */
  namespace: Scalars['String'];
  /** spec.resourceType */
  resourceType: Scalars['String'];
  /** spec.consumerRef.kind — Organization or Project */
  consumerKind: Scalars['String'];
  /** spec.consumerRef.name */
  consumerName: Scalars['String'];
  /** spec.consumerRef.apiGroup */
  consumerApiGroup: Scalars['String'];
  /** status.allocated */
  allocated: Scalars['Int'];
  /** status.limit */
  limit: Scalars['Int'];
  /** status.available */
  available: Scalars['Int'];
  /** Display name: kubernetes.io/display-name annotation → hardcoded map → raw resourceType */
  displayName: Scalars['String'];
  /** kubernetes.io/description annotation or spec.description from the ResourceRegistration */
  description?: Scalars['String'];
  /** spec.type from the ResourceRegistration: Entity, Allocation, or Feature */
  registrationType?: Scalars['String'];
  /** Owning service canonical name from labels (services.miloapis.com/owner or /service) */
  serviceOwner?: Scalars['String'];
  /** Resolved human-readable service group name */
  serviceDisplayName: Scalars['String'];
  __typename: 'QuotaBucket';
}

export interface QuotaBucketList {
  items: QuotaBucket[];
  __typename: 'QuotaBucketList';
}

export interface QuotaGrantAllowance {
  /** resourceType for this allowance */
  resourceType: Scalars['String'];
  /** Resolved display name (same logic as QuotaBucket.displayName) */
  displayName: Scalars['String'];
  /** Resolved service group name */
  serviceDisplayName: Scalars['String'];
  /** Sum of all bucket amounts for this resourceType within the grant */
  amount: Scalars['Int'];
  __typename: 'QuotaGrantAllowance';
}

export interface QuotaCondition {
  type: Scalars['String'];
  status: Scalars['String'];
  message?: Scalars['String'];
  __typename: 'QuotaCondition';
}

export interface QuotaGrant {
  /** metadata.name */
  name: Scalars['String'];
  /** metadata.namespace */
  namespace: Scalars['String'];
  /** metadata.creationTimestamp */
  createdAt?: Scalars['String'];
  /** Whether this grant was auto-created (quota.miloapis.com/auto-created label) */
  autoCreated: Scalars['Boolean'];
  /** Flattened and enriched allowances (one entry per resourceType) */
  allowances: QuotaGrantAllowance[];
  /** status.conditions for status badge display */
  conditions: QuotaCondition[];
  __typename: 'QuotaGrant';
}

export interface QuotaGrantList {
  items: QuotaGrant[];
  __typename: 'QuotaGrantList';
}

export interface QueryRequest {
  /**
   * Lists ServiceConsumers in the given producer project, enriched with each
   * consumer project's human-readable display name (the
   * kubernetes.io/description annotation on the Project, falling back to the
   * project name).
   *
   * Authorization uses the caller's bearer token for both the consumer list
   * (in the producer project's control plane) and the per-project lookups (at
   * the core resourcemanager API). A list failure returns an empty list; a
   * per-project lookup failure degrades that row to the raw project name.
   *
   * serviceNames, when given, keeps only consumers whose spec.serviceRef.name
   * matches one of them. Filtering happens before enrichment, so project and
   * organization lookups run only for the consumers that are returned.
   */
  serviceConsumers?: [
    { producerProject: Scalars['ID']; serviceNames?: Scalars['String'][] | null },
    ServiceConsumerRequest,
  ];
  /**
   * Returns sessions for the authenticated caller by default.
   *
   * When userID is provided and differs from the caller, the request is
   * forwarded to milo with a status.userUID field selector. milo authorizes
   * the cross-user lookup via SubjectAccessReview against
   * iam.miloapis.com/users/<userID> — callers without that permission get
   * an empty list (the underlying 403 is logged).
   */
  sessions?: [{ userID?: Scalars['ID'] | null }, ExtendedSessionRequest] | ExtendedSessionRequest;
  /**
   * Lists ContactGroupMemberships across all namespaces, enriched with full
   * Contact data for each membership. Resolves all contacts in parallel.
   * fieldSelector supports standard Kubernetes field selectors.
   */
  contactGroupMembershipsWithContacts?:
    | [
        {
          namespace?: Scalars['String'] | null;
          fieldSelector?: Scalars['String'] | null;
          limit?: Scalars['Int'] | null;
          cursor?: Scalars['String'] | null;
        },
        EnrichedContactGroupMembershipListRequest,
      ]
    | EnrichedContactGroupMembershipListRequest;
  /**
   * Lists ContactGroupMemberships in the given namespace, enriched with full
   * ContactGroup data for each membership. Resolves all contact groups in parallel.
   */
  contactMembershipsWithGroups?:
    | [
        {
          namespace?: Scalars['String'] | null;
          fieldSelector?: Scalars['String'] | null;
          limit?: Scalars['Int'] | null;
          cursor?: Scalars['String'] | null;
        },
        EnrichedContactMembershipListRequest,
      ]
    | EnrichedContactMembershipListRequest;
  /**
   * Batch-fetches User summaries by name. Fetches run in parallel; individual
   * lookup failures return null for that entry (filtered from the result).
   */
  userSummaries?: [{ names: Scalars['String'][] }, UserSummaryRequest];
  /**
   * Lists users (iam.miloapis.com) with each user's latest fraud score joined in.
   * `search` is an exact email match (spec.email); `platformAccess` filters on
   * status.platformAccess. Paginate with `limit` / `cursor`.
   */
  users?:
    | [
        {
          limit?: Scalars['Int'] | null;
          cursor?: Scalars['String'] | null;
          search?: Scalars['String'] | null;
          platformAccess?: Scalars['String'] | null;
        },
        UserListRequest,
      ]
    | UserListRequest;
  /**
   * Lists all organizations the caller can access. When `search` is set, matches
   * substring against name, displayName, company, and contact fields (walks
   * upstream pages until `limit` matches).
   */
  organizations?:
    | [
        {
          limit?: Scalars['Int'] | null;
          cursor?: Scalars['String'] | null;
          search?: Scalars['String'] | null;
        },
        OrganizationListRequest,
      ]
    | OrganizationListRequest;
  /** Returns a single organization by name. */
  organization?: [{ name: Scalars['String'] }, OrganizationRequest];
  /** Lists projects in an organization via its control plane. */
  organizationProjects?: [
    {
      orgName: Scalars['String'];
      limit?: Scalars['Int'] | null;
      cursor?: Scalars['String'] | null;
    },
    ProjectListRequest,
  ];
  /** Lists members and pending invitations for an organization. */
  organizationMembers?: [{ orgName: Scalars['String'] }, OrgMemberRequest];
  /** Lists all projects the caller can access. */
  projects?:
    | [
        {
          limit?: Scalars['Int'] | null;
          cursor?: Scalars['String'] | null;
          search?: Scalars['String'] | null;
        },
        ProjectListRequest,
      ]
    | ProjectListRequest;
  /** Returns a single project by name. */
  project?: [{ name: Scalars['String'] }, ProjectRequest];
  /** Enriched quota buckets for an org — joins AllowanceBuckets with ResourceRegistrations server-side. */
  orgQuotaBuckets?: [{ orgName: Scalars['String'] }, QuotaBucketListRequest];
  /** Enriched quota buckets for a project — joins AllowanceBuckets with ResourceRegistrations server-side. */
  projectQuotaBuckets?: [{ projectName: Scalars['String'] }, QuotaBucketListRequest];
  /** Enriched resource grants for an org with flattened, display-enriched allowances. */
  orgQuotaGrants?: [{ orgName: Scalars['String'] }, QuotaGrantListRequest];
  /** Enriched resource grants for a project with flattened, display-enriched allowances. */
  projectQuotaGrants?: [{ projectName: Scalars['String'] }, QuotaGrantListRequest];
  __typename?: boolean | number;
  __scalar?: boolean | number;
  __alias?: {
    [alias: string]: QueryRequest;
  };
}

export interface ParsedUserAgentRequest {
  browser?: boolean | number;
  os?: boolean | number;
  formatted?: boolean | number;
  __typename?: boolean | number;
  __scalar?: boolean | number;
  __alias?: {
    [alias: string]: ParsedUserAgentRequest;
  };
}

export interface GeoLocationRequest {
  city?: boolean | number;
  country?: boolean | number;
  countryCode?: boolean | number;
  formatted?: boolean | number;
  __typename?: boolean | number;
  __scalar?: boolean | number;
  __alias?: {
    [alias: string]: GeoLocationRequest;
  };
}

export interface ExtendedSessionRequest {
  id?: boolean | number;
  userUID?: boolean | number;
  provider?: boolean | number;
  ipAddress?: boolean | number;
  fingerprintID?: boolean | number;
  createdAt?: boolean | number;
  lastUpdatedAt?: boolean | number;
  userAgent?: ParsedUserAgentRequest;
  location?: GeoLocationRequest;
  __typename?: boolean | number;
  __scalar?: boolean | number;
  __alias?: {
    [alias: string]: ExtendedSessionRequest;
  };
}

export interface ConsumerProjectRequest {
  /** The project's machine name (metadata.name). */
  name?: boolean | number;
  /** Human-readable name from the kubernetes.io/display-name annotation, falling back to kubernetes.io/description, then name. */
  displayName?: boolean | number;
  /** The owning organization's machine name (spec.ownerRef.name). */
  organizationName?: boolean | number;
  /** Owning organization's display name (kubernetes.io/display-name), falling back to organizationName. */
  organizationDisplayName?: boolean | number;
  __typename?: boolean | number;
  __scalar?: boolean | number;
  __alias?: {
    [alias: string]: ConsumerProjectRequest;
  };
}

export interface ServiceConsumerRequest {
  /** The ServiceConsumer's name (metadata.name). */
  name?: boolean | number;
  /** The referenced service (spec.serviceRef.name), used by callers to filter by service. */
  serviceName?: boolean | number;
  /** Lifecycle phase (status.phase), e.g. Active, PendingApproval. */
  phase?: boolean | number;
  /** Approval decision (spec.approval.decision), e.g. Approved, Denied. */
  approvalDecision?: boolean | number;
  /** Optional approval note (spec.approval.message). */
  approvalMessage?: boolean | number;
  /** When the consumer was requested (metadata.creationTimestamp). */
  requestedAt?: boolean | number;
  /** The consuming project, enriched with its display name. */
  consumerProject?: ConsumerProjectRequest;
  __typename?: boolean | number;
  __scalar?: boolean | number;
  __alias?: {
    [alias: string]: ServiceConsumerRequest;
  };
}

export interface ContactRefRequest {
  name?: boolean | number;
  namespace?: boolean | number;
  __typename?: boolean | number;
  __scalar?: boolean | number;
  __alias?: {
    [alias: string]: ContactRefRequest;
  };
}

export interface EnrichedContactRequest {
  name?: boolean | number;
  namespace?: boolean | number;
  email?: boolean | number;
  givenName?: boolean | number;
  familyName?: boolean | number;
  displayName?: boolean | number;
  __typename?: boolean | number;
  __scalar?: boolean | number;
  __alias?: {
    [alias: string]: EnrichedContactRequest;
  };
}

/** A single Kubernetes-style status condition on a ContactGroup. */
export interface ContactGroupConditionRequest {
  type?: boolean | number;
  status?: boolean | number;
  reason?: boolean | number;
  message?: boolean | number;
  lastTransitionTime?: boolean | number;
  observedGeneration?: boolean | number;
  __typename?: boolean | number;
  __scalar?: boolean | number;
  __alias?: {
    [alias: string]: ContactGroupConditionRequest;
  };
}

export interface EnrichedContactGroupStatusRequest {
  conditions?: ContactGroupConditionRequest;
  __typename?: boolean | number;
  __scalar?: boolean | number;
  __alias?: {
    [alias: string]: EnrichedContactGroupStatusRequest;
  };
}

export interface EnrichedContactGroupRequest {
  name?: boolean | number;
  namespace?: boolean | number;
  displayName?: boolean | number;
  /** Whether the group allows opt-in/opt-out membership: 'public' or 'private'. */
  visibility?: boolean | number;
  /** Observed status of the ContactGroup (Ready condition, provider sync). */
  status?: EnrichedContactGroupStatusRequest;
  __typename?: boolean | number;
  __scalar?: boolean | number;
  __alias?: {
    [alias: string]: EnrichedContactGroupRequest;
  };
}

export interface ContactGroupMembershipEnrichedRequest {
  /** metadata.name of the ContactGroupMembership resource. */
  name?: boolean | number;
  contactRef?: ContactRefRequest;
  /** Full Contact data, null if lookup failed. */
  contact?: EnrichedContactRequest;
  __typename?: boolean | number;
  __scalar?: boolean | number;
  __alias?: {
    [alias: string]: ContactGroupMembershipEnrichedRequest;
  };
}

export interface ContactMembershipEnrichedRequest {
  /** metadata.name of the ContactGroupMembership resource. */
  name?: boolean | number;
  /** When the contact joined the group (membership metadata.creationTimestamp). */
  creationTimestamp?: boolean | number;
  contactGroupRef?: ContactRefRequest;
  /** Full ContactGroup data, null if lookup failed. */
  contactGroup?: EnrichedContactGroupRequest;
  __typename?: boolean | number;
  __scalar?: boolean | number;
  __alias?: {
    [alias: string]: ContactMembershipEnrichedRequest;
  };
}

export interface EnrichedContactGroupMembershipListRequest {
  items?: ContactGroupMembershipEnrichedRequest;
  /** Kubernetes continue token for pagination. */
  continue?: boolean | number;
  __typename?: boolean | number;
  __scalar?: boolean | number;
  __alias?: {
    [alias: string]: EnrichedContactGroupMembershipListRequest;
  };
}

export interface EnrichedContactMembershipListRequest {
  items?: ContactMembershipEnrichedRequest;
  continue?: boolean | number;
  __typename?: boolean | number;
  __scalar?: boolean | number;
  __alias?: {
    [alias: string]: EnrichedContactMembershipListRequest;
  };
}

export interface UserSummaryRequest {
  /** metadata.name of the User resource. */
  name?: boolean | number;
  email?: boolean | number;
  givenName?: boolean | number;
  familyName?: boolean | number;
  __typename?: boolean | number;
  __scalar?: boolean | number;
  __alias?: {
    [alias: string]: UserSummaryRequest;
  };
}

export interface UserRequest {
  /** metadata.name — the stable user ID. */
  name?: boolean | number;
  uid?: boolean | number;
  resourceVersion?: boolean | number;
  email?: boolean | number;
  givenName?: boolean | number;
  familyName?: boolean | number;
  createdAt?: boolean | number;
  /** preferences/theme annotation. */
  theme?: boolean | number;
  /** preferences/timezone annotation. */
  timezone?: boolean | number;
  /** preferences/newsletter annotation parsed to boolean. */
  newsletter?: boolean | number;
  /** onboarding/completedAt annotation. */
  onboardedAt?: boolean | number;
  registrationApproval?: boolean | number;
  state?: boolean | number;
  avatarUrl?: boolean | number;
  lastLoginProvider?: boolean | number;
  nameReviewRequired?: boolean | number;
  /** status.platformAccess — the platform access state. */
  platformAccess?: boolean | number;
  /** Latest fraud evaluation score — status.compositeScore (0-100). Null when never evaluated. */
  fraudScore?: boolean | number;
  /** Latest fraud decision — ACCEPTED | REVIEW | DEACTIVATE. */
  fraudDecision?: boolean | number;
  /** Latest fraud evaluation time (ISO 8601). */
  fraudEvaluatedAt?: boolean | number;
  __typename?: boolean | number;
  __scalar?: boolean | number;
  __alias?: {
    [alias: string]: UserRequest;
  };
}

export interface UserListRequest {
  items?: UserRequest;
  continueToken?: boolean | number;
  __typename?: boolean | number;
  __scalar?: boolean | number;
  __alias?: {
    [alias: string]: UserListRequest;
  };
}

export interface OrgContactInfoRequest {
  /** Legal / company name from spec.contactInfo.businessName. */
  businessName?: boolean | number;
  /** Primary contact name from spec.contactInfo.name. */
  name?: boolean | number;
  /** Primary contact email from spec.contactInfo.email. */
  email?: boolean | number;
  __typename?: boolean | number;
  __scalar?: boolean | number;
  __alias?: {
    [alias: string]: OrgContactInfoRequest;
  };
}

export interface OrganizationRequest {
  /** metadata.name — the stable organization ID. */
  name?: boolean | number;
  /** Human-readable name from the kubernetes.io/display-name annotation, falling back to name. */
  displayName?: boolean | number;
  /** Organization type: Personal or Standard. */
  type?: boolean | number;
  createdAt?: boolean | number;
  /** Status of the Ready condition. */
  state?: boolean | number;
  /** Contact details from spec.contactInfo. */
  contactInfo?: OrgContactInfoRequest;
  /** True when the OnboardingComplete condition status is True. */
  onboardingComplete?: boolean | number;
  /** Reason from the OnboardingComplete condition. */
  onboardingReason?: boolean | number;
  /** Human-readable message from the OnboardingComplete condition. */
  onboardingMessage?: boolean | number;
  /** Members and pending invitations for this organization. */
  members?: OrgMemberRequest;
  /** Projects owned by this organization (via its control plane). */
  projects?:
    | [{ limit?: Scalars['Int'] | null; cursor?: Scalars['String'] | null }, ProjectListRequest]
    | ProjectListRequest;
  __typename?: boolean | number;
  __scalar?: boolean | number;
  __alias?: {
    [alias: string]: OrganizationRequest;
  };
}

export interface OrganizationListRequest {
  items?: OrganizationRequest;
  /** Pagination cursor — pass as cursor on the next call to continue listing. */
  continueToken?: boolean | number;
  __typename?: boolean | number;
  __scalar?: boolean | number;
  __alias?: {
    [alias: string]: OrganizationListRequest;
  };
}

export interface ProjectRequest {
  /** metadata.name — the stable project ID. */
  name?: boolean | number;
  /** Human-readable name from the kubernetes.io/display-name annotation, falling back to kubernetes.io/description, then name. */
  displayName?: boolean | number;
  /** Name of the owning organization. */
  organizationName?: boolean | number;
  /** Owning organization's display name (kubernetes.io/display-name), falling back to organizationName. */
  organizationDisplayName?: boolean | number;
  /** Owning organization's company / legal name from contactInfo.businessName. */
  organizationBusinessName?: boolean | number;
  /** True when the project has an Active billing-account binding to an account with a default payment method. */
  hasActiveBillingAccount?: boolean | number;
  /** Bound billing account name when hasActiveBillingAccount is true. */
  billingAccountName?: boolean | number;
  createdAt?: boolean | number;
  /** Status of the Ready condition. */
  state?: boolean | number;
  /** metadata.deletionTimestamp — set while the project is terminating. */
  deletionTimestamp?: boolean | number;
  /** Unparsed ResourceCleanup condition message naming what deletion is waiting on. */
  resourceCleanupMessage?: boolean | number;
  __typename?: boolean | number;
  __scalar?: boolean | number;
  __alias?: {
    [alias: string]: ProjectRequest;
  };
}

export interface ProjectListRequest {
  items?: ProjectRequest;
  /** Pagination cursor — pass as cursor on the next call to continue listing. */
  continueToken?: boolean | number;
  __typename?: boolean | number;
  __scalar?: boolean | number;
  __alias?: {
    [alias: string]: ProjectListRequest;
  };
}

export interface OrgMemberRequest {
  /** Resource name of the membership or invitation. */
  name?: boolean | number;
  givenName?: boolean | number;
  familyName?: boolean | number;
  email?: boolean | number;
  roles?: boolean | number;
  /** member or invitation */
  type?: boolean | number;
  /** Only set for invitations: Pending, Accepted, Declined. */
  invitationState?: boolean | number;
  createdAt?: boolean | number;
  /** The member's user resource name. Null for invitations, which have no user yet. */
  userName?: boolean | number;
  /** Avatar URL from the membership user status. Null for invitations. */
  avatarUrl?: boolean | number;
  __typename?: boolean | number;
  __scalar?: boolean | number;
  __alias?: {
    [alias: string]: OrgMemberRequest;
  };
}

export interface QuotaBucketRequest {
  /** metadata.name */
  name?: boolean | number;
  /** metadata.namespace (needed for grant creation) */
  namespace?: boolean | number;
  /** spec.resourceType */
  resourceType?: boolean | number;
  /** spec.consumerRef.kind — Organization or Project */
  consumerKind?: boolean | number;
  /** spec.consumerRef.name */
  consumerName?: boolean | number;
  /** spec.consumerRef.apiGroup */
  consumerApiGroup?: boolean | number;
  /** status.allocated */
  allocated?: boolean | number;
  /** status.limit */
  limit?: boolean | number;
  /** status.available */
  available?: boolean | number;
  /** Display name: kubernetes.io/display-name annotation → hardcoded map → raw resourceType */
  displayName?: boolean | number;
  /** kubernetes.io/description annotation or spec.description from the ResourceRegistration */
  description?: boolean | number;
  /** spec.type from the ResourceRegistration: Entity, Allocation, or Feature */
  registrationType?: boolean | number;
  /** Owning service canonical name from labels (services.miloapis.com/owner or /service) */
  serviceOwner?: boolean | number;
  /** Resolved human-readable service group name */
  serviceDisplayName?: boolean | number;
  __typename?: boolean | number;
  __scalar?: boolean | number;
  __alias?: {
    [alias: string]: QuotaBucketRequest;
  };
}

export interface QuotaBucketListRequest {
  items?: QuotaBucketRequest;
  __typename?: boolean | number;
  __scalar?: boolean | number;
  __alias?: {
    [alias: string]: QuotaBucketListRequest;
  };
}

export interface QuotaGrantAllowanceRequest {
  /** resourceType for this allowance */
  resourceType?: boolean | number;
  /** Resolved display name (same logic as QuotaBucket.displayName) */
  displayName?: boolean | number;
  /** Resolved service group name */
  serviceDisplayName?: boolean | number;
  /** Sum of all bucket amounts for this resourceType within the grant */
  amount?: boolean | number;
  __typename?: boolean | number;
  __scalar?: boolean | number;
  __alias?: {
    [alias: string]: QuotaGrantAllowanceRequest;
  };
}

export interface QuotaConditionRequest {
  type?: boolean | number;
  status?: boolean | number;
  message?: boolean | number;
  __typename?: boolean | number;
  __scalar?: boolean | number;
  __alias?: {
    [alias: string]: QuotaConditionRequest;
  };
}

export interface QuotaGrantRequest {
  /** metadata.name */
  name?: boolean | number;
  /** metadata.namespace */
  namespace?: boolean | number;
  /** metadata.creationTimestamp */
  createdAt?: boolean | number;
  /** Whether this grant was auto-created (quota.miloapis.com/auto-created label) */
  autoCreated?: boolean | number;
  /** Flattened and enriched allowances (one entry per resourceType) */
  allowances?: QuotaGrantAllowanceRequest;
  /** status.conditions for status badge display */
  conditions?: QuotaConditionRequest;
  __typename?: boolean | number;
  __scalar?: boolean | number;
  __alias?: {
    [alias: string]: QuotaGrantRequest;
  };
}

export interface QuotaGrantListRequest {
  items?: QuotaGrantRequest;
  __typename?: boolean | number;
  __scalar?: boolean | number;
  __alias?: {
    [alias: string]: QuotaGrantListRequest;
  };
}

const Query_possibleTypes: string[] = ['Query'];
export const isQuery = (obj?: { __typename?: any } | null): obj is Query => {
  if (!obj?.__typename) throw new Error('__typename is missing in "isQuery"');
  return Query_possibleTypes.includes(obj.__typename);
};

const ParsedUserAgent_possibleTypes: string[] = ['ParsedUserAgent'];
export const isParsedUserAgent = (obj?: { __typename?: any } | null): obj is ParsedUserAgent => {
  if (!obj?.__typename) throw new Error('__typename is missing in "isParsedUserAgent"');
  return ParsedUserAgent_possibleTypes.includes(obj.__typename);
};

const GeoLocation_possibleTypes: string[] = ['GeoLocation'];
export const isGeoLocation = (obj?: { __typename?: any } | null): obj is GeoLocation => {
  if (!obj?.__typename) throw new Error('__typename is missing in "isGeoLocation"');
  return GeoLocation_possibleTypes.includes(obj.__typename);
};

const ExtendedSession_possibleTypes: string[] = ['ExtendedSession'];
export const isExtendedSession = (obj?: { __typename?: any } | null): obj is ExtendedSession => {
  if (!obj?.__typename) throw new Error('__typename is missing in "isExtendedSession"');
  return ExtendedSession_possibleTypes.includes(obj.__typename);
};

const ConsumerProject_possibleTypes: string[] = ['ConsumerProject'];
export const isConsumerProject = (obj?: { __typename?: any } | null): obj is ConsumerProject => {
  if (!obj?.__typename) throw new Error('__typename is missing in "isConsumerProject"');
  return ConsumerProject_possibleTypes.includes(obj.__typename);
};

const ServiceConsumer_possibleTypes: string[] = ['ServiceConsumer'];
export const isServiceConsumer = (obj?: { __typename?: any } | null): obj is ServiceConsumer => {
  if (!obj?.__typename) throw new Error('__typename is missing in "isServiceConsumer"');
  return ServiceConsumer_possibleTypes.includes(obj.__typename);
};

const ContactRef_possibleTypes: string[] = ['ContactRef'];
export const isContactRef = (obj?: { __typename?: any } | null): obj is ContactRef => {
  if (!obj?.__typename) throw new Error('__typename is missing in "isContactRef"');
  return ContactRef_possibleTypes.includes(obj.__typename);
};

const EnrichedContact_possibleTypes: string[] = ['EnrichedContact'];
export const isEnrichedContact = (obj?: { __typename?: any } | null): obj is EnrichedContact => {
  if (!obj?.__typename) throw new Error('__typename is missing in "isEnrichedContact"');
  return EnrichedContact_possibleTypes.includes(obj.__typename);
};

const ContactGroupCondition_possibleTypes: string[] = ['ContactGroupCondition'];
export const isContactGroupCondition = (
  obj?: { __typename?: any } | null
): obj is ContactGroupCondition => {
  if (!obj?.__typename) throw new Error('__typename is missing in "isContactGroupCondition"');
  return ContactGroupCondition_possibleTypes.includes(obj.__typename);
};

const EnrichedContactGroupStatus_possibleTypes: string[] = ['EnrichedContactGroupStatus'];
export const isEnrichedContactGroupStatus = (
  obj?: { __typename?: any } | null
): obj is EnrichedContactGroupStatus => {
  if (!obj?.__typename) throw new Error('__typename is missing in "isEnrichedContactGroupStatus"');
  return EnrichedContactGroupStatus_possibleTypes.includes(obj.__typename);
};

const EnrichedContactGroup_possibleTypes: string[] = ['EnrichedContactGroup'];
export const isEnrichedContactGroup = (
  obj?: { __typename?: any } | null
): obj is EnrichedContactGroup => {
  if (!obj?.__typename) throw new Error('__typename is missing in "isEnrichedContactGroup"');
  return EnrichedContactGroup_possibleTypes.includes(obj.__typename);
};

const ContactGroupMembershipEnriched_possibleTypes: string[] = ['ContactGroupMembershipEnriched'];
export const isContactGroupMembershipEnriched = (
  obj?: { __typename?: any } | null
): obj is ContactGroupMembershipEnriched => {
  if (!obj?.__typename)
    throw new Error('__typename is missing in "isContactGroupMembershipEnriched"');
  return ContactGroupMembershipEnriched_possibleTypes.includes(obj.__typename);
};

const ContactMembershipEnriched_possibleTypes: string[] = ['ContactMembershipEnriched'];
export const isContactMembershipEnriched = (
  obj?: { __typename?: any } | null
): obj is ContactMembershipEnriched => {
  if (!obj?.__typename) throw new Error('__typename is missing in "isContactMembershipEnriched"');
  return ContactMembershipEnriched_possibleTypes.includes(obj.__typename);
};

const EnrichedContactGroupMembershipList_possibleTypes: string[] = [
  'EnrichedContactGroupMembershipList',
];
export const isEnrichedContactGroupMembershipList = (
  obj?: { __typename?: any } | null
): obj is EnrichedContactGroupMembershipList => {
  if (!obj?.__typename)
    throw new Error('__typename is missing in "isEnrichedContactGroupMembershipList"');
  return EnrichedContactGroupMembershipList_possibleTypes.includes(obj.__typename);
};

const EnrichedContactMembershipList_possibleTypes: string[] = ['EnrichedContactMembershipList'];
export const isEnrichedContactMembershipList = (
  obj?: { __typename?: any } | null
): obj is EnrichedContactMembershipList => {
  if (!obj?.__typename)
    throw new Error('__typename is missing in "isEnrichedContactMembershipList"');
  return EnrichedContactMembershipList_possibleTypes.includes(obj.__typename);
};

const UserSummary_possibleTypes: string[] = ['UserSummary'];
export const isUserSummary = (obj?: { __typename?: any } | null): obj is UserSummary => {
  if (!obj?.__typename) throw new Error('__typename is missing in "isUserSummary"');
  return UserSummary_possibleTypes.includes(obj.__typename);
};

const User_possibleTypes: string[] = ['User'];
export const isUser = (obj?: { __typename?: any } | null): obj is User => {
  if (!obj?.__typename) throw new Error('__typename is missing in "isUser"');
  return User_possibleTypes.includes(obj.__typename);
};

const UserList_possibleTypes: string[] = ['UserList'];
export const isUserList = (obj?: { __typename?: any } | null): obj is UserList => {
  if (!obj?.__typename) throw new Error('__typename is missing in "isUserList"');
  return UserList_possibleTypes.includes(obj.__typename);
};

const OrgContactInfo_possibleTypes: string[] = ['OrgContactInfo'];
export const isOrgContactInfo = (obj?: { __typename?: any } | null): obj is OrgContactInfo => {
  if (!obj?.__typename) throw new Error('__typename is missing in "isOrgContactInfo"');
  return OrgContactInfo_possibleTypes.includes(obj.__typename);
};

const Organization_possibleTypes: string[] = ['Organization'];
export const isOrganization = (obj?: { __typename?: any } | null): obj is Organization => {
  if (!obj?.__typename) throw new Error('__typename is missing in "isOrganization"');
  return Organization_possibleTypes.includes(obj.__typename);
};

const OrganizationList_possibleTypes: string[] = ['OrganizationList'];
export const isOrganizationList = (obj?: { __typename?: any } | null): obj is OrganizationList => {
  if (!obj?.__typename) throw new Error('__typename is missing in "isOrganizationList"');
  return OrganizationList_possibleTypes.includes(obj.__typename);
};

const Project_possibleTypes: string[] = ['Project'];
export const isProject = (obj?: { __typename?: any } | null): obj is Project => {
  if (!obj?.__typename) throw new Error('__typename is missing in "isProject"');
  return Project_possibleTypes.includes(obj.__typename);
};

const ProjectList_possibleTypes: string[] = ['ProjectList'];
export const isProjectList = (obj?: { __typename?: any } | null): obj is ProjectList => {
  if (!obj?.__typename) throw new Error('__typename is missing in "isProjectList"');
  return ProjectList_possibleTypes.includes(obj.__typename);
};

const OrgMember_possibleTypes: string[] = ['OrgMember'];
export const isOrgMember = (obj?: { __typename?: any } | null): obj is OrgMember => {
  if (!obj?.__typename) throw new Error('__typename is missing in "isOrgMember"');
  return OrgMember_possibleTypes.includes(obj.__typename);
};

const QuotaBucket_possibleTypes: string[] = ['QuotaBucket'];
export const isQuotaBucket = (obj?: { __typename?: any } | null): obj is QuotaBucket => {
  if (!obj?.__typename) throw new Error('__typename is missing in "isQuotaBucket"');
  return QuotaBucket_possibleTypes.includes(obj.__typename);
};

const QuotaBucketList_possibleTypes: string[] = ['QuotaBucketList'];
export const isQuotaBucketList = (obj?: { __typename?: any } | null): obj is QuotaBucketList => {
  if (!obj?.__typename) throw new Error('__typename is missing in "isQuotaBucketList"');
  return QuotaBucketList_possibleTypes.includes(obj.__typename);
};

const QuotaGrantAllowance_possibleTypes: string[] = ['QuotaGrantAllowance'];
export const isQuotaGrantAllowance = (
  obj?: { __typename?: any } | null
): obj is QuotaGrantAllowance => {
  if (!obj?.__typename) throw new Error('__typename is missing in "isQuotaGrantAllowance"');
  return QuotaGrantAllowance_possibleTypes.includes(obj.__typename);
};

const QuotaCondition_possibleTypes: string[] = ['QuotaCondition'];
export const isQuotaCondition = (obj?: { __typename?: any } | null): obj is QuotaCondition => {
  if (!obj?.__typename) throw new Error('__typename is missing in "isQuotaCondition"');
  return QuotaCondition_possibleTypes.includes(obj.__typename);
};

const QuotaGrant_possibleTypes: string[] = ['QuotaGrant'];
export const isQuotaGrant = (obj?: { __typename?: any } | null): obj is QuotaGrant => {
  if (!obj?.__typename) throw new Error('__typename is missing in "isQuotaGrant"');
  return QuotaGrant_possibleTypes.includes(obj.__typename);
};

const QuotaGrantList_possibleTypes: string[] = ['QuotaGrantList'];
export const isQuotaGrantList = (obj?: { __typename?: any } | null): obj is QuotaGrantList => {
  if (!obj?.__typename) throw new Error('__typename is missing in "isQuotaGrantList"');
  return QuotaGrantList_possibleTypes.includes(obj.__typename);
};
