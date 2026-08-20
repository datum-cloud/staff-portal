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
   */
  serviceConsumers?: [{ producerProject: Scalars['ID'] }, ServiceConsumerRequest];
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
