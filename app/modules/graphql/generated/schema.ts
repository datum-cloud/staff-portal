export type Scalars = {
  ID: string;
  String: string;
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
  /** Human-readable name from the kubernetes.io/description annotation, falling back to name. */
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
  /** Human-readable name from the kubernetes.io/description annotation, falling back to name. */
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
