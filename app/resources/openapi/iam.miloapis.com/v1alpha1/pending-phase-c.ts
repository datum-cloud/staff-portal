// TEMPORARY hand-written extension of the generated iam.miloapis.com/v1alpha1 User; delete
// this file and read `status.emailVerification` straight off `types.gen.ts` once
// `bun run openapi:generate` can see milo#782 on staging.
//
// milo#782 replaced the `EmailVerified` condition with a typed status field
// (pkg/apis/iam/v1alpha1/user_types.go). Staging still serves the older schema, so the
// generated types have no `emailVerification` yet. The field below is shaped exactly as
// @hey-api/openapi-ts emits an inline enum for this group — a bare string union on the
// inline UserStatus, the way `platformAccess` and `state` already are — so the swap is
// deleting this file and pointing the import back at the generated User.
import type { ComMiloapisIamV1Alpha1User } from './types.gen';

/**
 * {@link ComMiloapisIamV1Alpha1User} with milo#782's `status.emailVerification`.
 *
 * zitadel-provider writes the field from Zitadel's email events and reconciles it on every
 * sweep. Absent means it has not written one yet — a different answer from `Unverified`.
 */
export type UserWithEmailVerification = Omit<ComMiloapisIamV1Alpha1User, 'status'> & {
  status?: NonNullable<ComMiloapisIamV1Alpha1User['status']> & {
    /**
     * EmailVerification reports whether the authentication provider has confirmed this
     * user's email address.
     */
    emailVerification?: 'Verified' | 'Unverified';
  };
};
