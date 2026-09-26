// TEMPORARY hand-written mirror of milo-os/zitadel-provider#135's PasskeyRegistrationLink;
// delete this file and switch the import to the generated exports once staging serves
// /apis/identity.miloapis.com/v1alpha1/passkeyregistrationlinks and
// `bun run openapi:generate` can see it. Passkey itself is already generated.
//
// Shaped exactly as @hey-api/openapi-ts emits this group — same type-name prefix, same
// `Options` plumbing, same `ProxyResponse` envelope — so the swap is an import change and
// nothing else. The object shapes come from milo's
// pkg/apis/identity/v1alpha1/passkeyregistrationlink_types.go; the URL from zitadel-provider's
// internal/apiserver/identity/passkeyregistrationlinks/rest.go.
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
export type GoMiloapisComMiloPkgApisIdentityV1Alpha1PasskeyRegistrationLink = {
  /**
   * APIVersion defines the versioned schema of this representation of an object. Servers should convert recognized schemas to the latest internal value, and may reject unrecognized values. More info: https://git.k8s.io/community/contributors/devel/sig-architecture/api-conventions.md#resources
   */
  apiVersion?: string;
  /**
   * Kind is a string value representing the REST resource this object represents. Servers may infer this from the endpoint the client submits requests to. Cannot be updated. In CamelCase. More info: https://git.k8s.io/community/contributors/devel/sig-architecture/api-conventions.md#types-kinds
   */
  kind?: string;
  metadata?: IoK8sApimachineryPkgApisMetaV1ObjectMeta;
  spec?: GoMiloapisComMiloPkgApisIdentityV1Alpha1PasskeyRegistrationLinkSpec;
  status?: GoMiloapisComMiloPkgApisIdentityV1Alpha1PasskeyRegistrationLinkStatus;
};

/**
 * PasskeyRegistrationLinkList is a list of PasskeyRegistrationLink resources.
 */
export type GoMiloapisComMiloPkgApisIdentityV1Alpha1PasskeyRegistrationLinkList = {
  /**
   * APIVersion defines the versioned schema of this representation of an object. Servers should convert recognized schemas to the latest internal value, and may reject unrecognized values. More info: https://git.k8s.io/community/contributors/devel/sig-architecture/api-conventions.md#resources
   */
  apiVersion?: string;
  items: Array<GoMiloapisComMiloPkgApisIdentityV1Alpha1PasskeyRegistrationLink>;
  /**
   * Kind is a string value representing the REST resource this object represents. Servers may infer this from the endpoint the client submits requests to. Cannot be updated. In CamelCase. More info: https://git.k8s.io/community/contributors/devel/sig-architecture/api-conventions.md#types-kinds
   */
  kind?: string;
  metadata?: IoK8sApimachineryPkgApisMetaV1ListMeta;
};

/**
 * PasskeyRegistrationLinkSpec is what support asks for.
 */
export type GoMiloapisComMiloPkgApisIdentityV1Alpha1PasskeyRegistrationLinkSpec = {
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
export type GoMiloapisComMiloPkgApisIdentityV1Alpha1PasskeyRegistrationLinkStatus = {
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

export type CreateIdentityMiloapisComV1Alpha1PasskeyRegistrationLinkData = {
  body: GoMiloapisComMiloPkgApisIdentityV1Alpha1PasskeyRegistrationLink;
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
  200: ProxyResponse<GoMiloapisComMiloPkgApisIdentityV1Alpha1PasskeyRegistrationLink>;
  /**
   * Created
   */
  201: ProxyResponse<GoMiloapisComMiloPkgApisIdentityV1Alpha1PasskeyRegistrationLink>;
  /**
   * Accepted
   */
  202: ProxyResponse<GoMiloapisComMiloPkgApisIdentityV1Alpha1PasskeyRegistrationLink>;
};

export type CreateIdentityMiloapisComV1Alpha1PasskeyRegistrationLinkResponse =
  CreateIdentityMiloapisComV1Alpha1PasskeyRegistrationLinkResponses[keyof CreateIdentityMiloapisComV1Alpha1PasskeyRegistrationLinkResponses]['data'];

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
