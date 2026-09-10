// TEMPORARY hand-written mirror of milo-os/zitadel-provider#135's types; delete this file
// and switch imports to the generated exports once `bun run openapi:generate` can see #135
// on staging.
//
// Everything below is shaped exactly as @hey-api/openapi-ts would emit it for the
// identity.miloapis.com/v1alpha1 group — same type names, same `Options` plumbing, same
// `ProxyResponse` envelope — so the swap is an import change and nothing else. The source
// of truth for the object shapes is milo's pkg/apis/identity/v1alpha1
// ({passkey,passkeyregistrationlink}_types.go); the URLs come from zitadel-provider's
// internal/apiserver/identity/{passkeys,passkeyregistrationlinks}/rest.go.
import type { RequestResult } from '../../shared/client';
import { client } from '../../shared/client.gen';
import type { ProxyResponse } from '../../shared/core/types.gen';
import type { Options } from './sdk.gen';
import type {
  IoK8sApimachineryPkgApisMetaV1ListMeta,
  IoK8sApimachineryPkgApisMetaV1ObjectMeta,
  IoK8sApimachineryPkgApisMetaV1Time,
} from './types.gen';

/**
 * PasskeyRegistrationLink asks the authentication provider to issue a single-use passkey
 * registration code for a user and mail it, through the notification pipeline, to that
 * user's VERIFIED email address.
 *
 * Create-only virtual resource: nothing is persisted, so the object exists only in the
 * create response. The durable record is the notification Email named by
 * `status.emailName`. The code is never part of this object.
 */
export type ComMiloapisGoMiloPkgApisIdentityV1Alpha1PasskeyRegistrationLink = {
  /**
   * APIVersion defines the versioned schema of this representation of an object. Servers should convert recognized schemas to the latest internal value, and may reject unrecognized values. More info: https://git.k8s.io/community/contributors/devel/sig-architecture/api-conventions.md#resources
   */
  apiVersion?: string;
  /**
   * Kind is a string value representing the REST resource this object represents. Servers may infer this from the endpoint the client submits requests to. Cannot be updated. In CamelCase. More info: https://git.k8s.io/community/contributors/devel/sig-architecture/api-conventions.md#types-kinds
   */
  kind?: string;
  metadata?: IoK8sApimachineryPkgApisMetaV1ObjectMeta;
  spec?: ComMiloapisGoMiloPkgApisIdentityV1Alpha1PasskeyRegistrationLinkSpec;
  status?: ComMiloapisGoMiloPkgApisIdentityV1Alpha1PasskeyRegistrationLinkStatus;
};

/**
 * PasskeyRegistrationLinkList is a list of PasskeyRegistrationLink resources.
 */
export type ComMiloapisGoMiloPkgApisIdentityV1Alpha1PasskeyRegistrationLinkList = {
  /**
   * APIVersion defines the versioned schema of this representation of an object. Servers should convert recognized schemas to the latest internal value, and may reject unrecognized values. More info: https://git.k8s.io/community/contributors/devel/sig-architecture/api-conventions.md#resources
   */
  apiVersion?: string;
  items: Array<ComMiloapisGoMiloPkgApisIdentityV1Alpha1PasskeyRegistrationLink>;
  /**
   * Kind is a string value representing the REST resource this object represents. Servers may infer this from the endpoint the client submits requests to. Cannot be updated. In CamelCase. More info: https://git.k8s.io/community/contributors/devel/sig-architecture/api-conventions.md#types-kinds
   */
  kind?: string;
  metadata?: IoK8sApimachineryPkgApisMetaV1ListMeta;
};

/**
 * PasskeyRegistrationLinkSpec is what support asks for.
 */
export type ComMiloapisGoMiloPkgApisIdentityV1Alpha1PasskeyRegistrationLinkSpec = {
  /**
   * Reason is why the link is being sent (ticket reference, customer request). Required.
   */
  reason: string;
  /**
   * RequestedBy is the metadata.name of the staff User asking. Recorded for audit; the server rejects a value that does not match the authenticated caller.
   */
  requestedBy: string;
  /**
   * UserRef names the iam.miloapis.com User (metadata.name is the provider user ID) who receives the link. The link only ever goes to that user's verified address.
   */
  userRef: {
    name: string;
  };
};

/**
 * PasskeyRegistrationLinkStatus is filled by the server on create.
 */
export type ComMiloapisGoMiloPkgApisIdentityV1Alpha1PasskeyRegistrationLinkStatus = {
  /**
   * EmailName is the notification.miloapis.com Email resource that carries the link.
   */
  emailName?: string;
  /**
   * ExpiresAt is when the issued code stops working (the provider's configured lifetime).
   */
  expiresAt?: IoK8sApimachineryPkgApisMetaV1Time;
  /**
   * UserUID is the UID of the User the link was sent to.
   */
  userUID?: string;
};

/**
 * Passkey represents a WebAuthn passkey credential registered by a user with the external
 * authentication provider. Read-only and virtual: metadata.name is the passkey ID assigned
 * by the provider.
 */
export type ComMiloapisGoMiloPkgApisIdentityV1Alpha1Passkey = {
  /**
   * APIVersion defines the versioned schema of this representation of an object. Servers should convert recognized schemas to the latest internal value, and may reject unrecognized values. More info: https://git.k8s.io/community/contributors/devel/sig-architecture/api-conventions.md#resources
   */
  apiVersion?: string;
  /**
   * Kind is a string value representing the REST resource this object represents. Servers may infer this from the endpoint the client submits requests to. Cannot be updated. In CamelCase. More info: https://git.k8s.io/community/contributors/devel/sig-architecture/api-conventions.md#types-kinds
   */
  kind?: string;
  metadata?: IoK8sApimachineryPkgApisMetaV1ObjectMeta;
  status?: ComMiloapisGoMiloPkgApisIdentityV1Alpha1PasskeyStatus;
};

/**
 * PasskeyList is a list of Passkey resources.
 */
export type ComMiloapisGoMiloPkgApisIdentityV1Alpha1PasskeyList = {
  /**
   * APIVersion defines the versioned schema of this representation of an object. Servers should convert recognized schemas to the latest internal value, and may reject unrecognized values. More info: https://git.k8s.io/community/contributors/devel/sig-architecture/api-conventions.md#resources
   */
  apiVersion?: string;
  items: Array<ComMiloapisGoMiloPkgApisIdentityV1Alpha1Passkey>;
  /**
   * Kind is a string value representing the REST resource this object represents. Servers may infer this from the endpoint the client submits requests to. Cannot be updated. In CamelCase. More info: https://git.k8s.io/community/contributors/devel/sig-architecture/api-conventions.md#types-kinds
   */
  kind?: string;
  metadata?: IoK8sApimachineryPkgApisMetaV1ListMeta;
};

/**
 * PasskeyStatus contains the details of a passkey credential. All fields are read-only and
 * populated by the authentication provider.
 */
export type ComMiloapisGoMiloPkgApisIdentityV1Alpha1PasskeyStatus = {
  /**
   * DisplayName is the human-readable name of the passkey, either user-supplied at enrollment or defaulted from the authenticator AAGUID / user agent.
   */
  displayName: string;
  /**
   * State is the current activation state of the passkey, derived from the provider's AuthFactorState.
   */
  state: string;
  /**
   * UserUID is the unique identifier of the Milo user who owns this passkey. Used as a field-selector target (status.userUID=<uid>) for cross-user reads by staff-support callers.
   */
  userUID: string;
};

export type CreateIdentityMiloapisComV1Alpha1PasskeyRegistrationLinkData = {
  body: ComMiloapisGoMiloPkgApisIdentityV1Alpha1PasskeyRegistrationLink;
  path?: never;
  query?: {
    /**
     * If 'true', then the output is pretty printed. Defaults to 'false' unless the user-agent indicates a browser or command-line HTTP tool (curl and wget).
     */
    pretty?: string;
    /**
     * When present, indicates that modifications should not be persisted. An invalid or unrecognized dryRun directive will result in an error response and no further processing of the request. Valid values are: - All: all dry run stages will be processed
     */
    dryRun?: string;
    /**
     * fieldManager is a name associated with the actor or entity that is making these changes. The value must be less than or 128 characters long, and only contain printable characters, as defined by https://golang.org/pkg/unicode/#IsPrint.
     */
    fieldManager?: string;
    /**
     * fieldValidation instructs the server on how to handle objects in the request (POST/PUT/PATCH) containing unknown or duplicate fields. Valid values are: - Ignore: This will ignore any unknown fields that are silently dropped from the object, and will ignore all but the last duplicate field that the decoder encounters. This is the default behavior prior to v1.23. - Warn: This will send a warning via the standard warning response header for each unknown field that is dropped from the object, and for each duplicate field that is encountered. The request will still succeed if there are no other errors, and will only persist the last of any duplicate fields. This is the default in v1.23+ - Strict: This will fail the request with a BadRequest error if any unknown fields would be dropped from the object, or if any duplicate fields are present. The error returned from the server will contain all unknown and duplicate fields encountered.
     */
    fieldValidation?: string;
  };
  url: '/apis/identity.miloapis.com/v1alpha1/passkeyregistrationlinks';
};

export type CreateIdentityMiloapisComV1Alpha1PasskeyRegistrationLinkErrors = {
  /**
   * Unauthorized
   */
  401: unknown;
};

export type CreateIdentityMiloapisComV1Alpha1PasskeyRegistrationLinkResponses = {
  /**
   * OK
   */
  200: ProxyResponse<ComMiloapisGoMiloPkgApisIdentityV1Alpha1PasskeyRegistrationLink>;
  /**
   * Created
   */
  201: ProxyResponse<ComMiloapisGoMiloPkgApisIdentityV1Alpha1PasskeyRegistrationLink>;
  /**
   * Accepted
   */
  202: ProxyResponse<ComMiloapisGoMiloPkgApisIdentityV1Alpha1PasskeyRegistrationLink>;
};

export type CreateIdentityMiloapisComV1Alpha1PasskeyRegistrationLinkResponse =
  CreateIdentityMiloapisComV1Alpha1PasskeyRegistrationLinkResponses[keyof CreateIdentityMiloapisComV1Alpha1PasskeyRegistrationLinkResponses]['data'];

export type ListIdentityMiloapisComV1Alpha1PasskeyData = {
  body?: never;
  path?: never;
  query?: {
    /**
     * The continue option should be set when retrieving more results from the server.
     */
    continue?: string;
    /**
     * A selector to restrict the list of returned objects by their fields. Defaults to everything.
     */
    fieldSelector?: string;
    /**
     * A selector to restrict the list of returned objects by their labels. Defaults to everything.
     */
    labelSelector?: string;
    /**
     * limit is a maximum number of responses to return for a list call.
     */
    limit?: number;
    /**
     * If 'true', then the output is pretty printed. Defaults to 'false' unless the user-agent indicates a browser or command-line HTTP tool (curl and wget).
     */
    pretty?: string;
    /**
     * resourceVersion sets a constraint on what resource versions a request may be served from. See https://kubernetes.io/docs/reference/using-api/api-concepts/#resource-versions for details.
     *
     * Defaults to unset
     */
    resourceVersion?: string;
    /**
     * Timeout for the list/watch call. This limits the duration of the call, regardless of any activity or inactivity.
     */
    timeoutSeconds?: number;
  };
  url: '/apis/identity.miloapis.com/v1alpha1/passkeys';
};

export type ListIdentityMiloapisComV1Alpha1PasskeyErrors = {
  /**
   * Unauthorized
   */
  401: unknown;
};

export type ListIdentityMiloapisComV1Alpha1PasskeyResponses = {
  /**
   * OK
   */
  200: ProxyResponse<ComMiloapisGoMiloPkgApisIdentityV1Alpha1PasskeyList>;
};

export type ListIdentityMiloapisComV1Alpha1PasskeyResponse =
  ListIdentityMiloapisComV1Alpha1PasskeyResponses[keyof ListIdentityMiloapisComV1Alpha1PasskeyResponses]['data'];

/**
 * create a PasskeyRegistrationLink
 */
export const createIdentityMiloapisComV1Alpha1PasskeyRegistrationLink = <
  ThrowOnError extends boolean = true,
>(
  options: Options<CreateIdentityMiloapisComV1Alpha1PasskeyRegistrationLinkData, ThrowOnError>
): RequestResult<
  CreateIdentityMiloapisComV1Alpha1PasskeyRegistrationLinkResponses,
  CreateIdentityMiloapisComV1Alpha1PasskeyRegistrationLinkErrors,
  ThrowOnError
> =>
  (options.client ?? client).post<
    CreateIdentityMiloapisComV1Alpha1PasskeyRegistrationLinkResponses,
    CreateIdentityMiloapisComV1Alpha1PasskeyRegistrationLinkErrors,
    ThrowOnError
  >({
    responseType: 'json',
    url: '/apis/identity.miloapis.com/v1alpha1/passkeyregistrationlinks',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

/**
 * list objects of kind Passkey
 */
export const listIdentityMiloapisComV1Alpha1Passkey = <ThrowOnError extends boolean = true>(
  options?: Options<ListIdentityMiloapisComV1Alpha1PasskeyData, ThrowOnError>
) =>
  (options?.client ?? client).get<
    ListIdentityMiloapisComV1Alpha1PasskeyResponses,
    ListIdentityMiloapisComV1Alpha1PasskeyErrors,
    ThrowOnError
  >({
    responseType: 'json',
    url: '/apis/identity.miloapis.com/v1alpha1/passkeys',
    ...options,
  });
