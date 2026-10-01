import { runGqlQuery } from '@/modules/graphql/client';

/**
 * GraphQL operation for a user's sessions, backed by the gateway, plus the
 * resource's type. `listSessions` in the api layer reshapes the raw rows (null
 * normalization + rebuilt user-agent/location) into `GqlSession` — a transform,
 * so the type is hand-written.
 */

/**
 * Lists sessions enriched with parsed user-agent and geolocation.
 *
 * When userID is omitted (or matches the caller's UID), returns the caller's own
 * sessions. When it differs, the gateway forwards a status.userUID field selector
 * and the auth-provider-zitadel REST handler authorizes the cross-user lookup via
 * SubjectAccessReview against iam.miloapis.com/users/<userID>. Callers without
 * that permission get an empty list (the underlying 403 is logged).
 */
export const sessionsOp = (userID?: string) =>
  runGqlQuery('StaffUserSessions', {
    sessions: [
      { userID: userID ?? null },
      {
        id: true,
        userUID: true,
        provider: true,
        ipAddress: true,
        fingerprintID: true,
        createdAt: true,
        lastUpdatedAt: true,
        userAgent: { browser: true, os: true, formatted: true },
        location: { city: true, country: true, countryCode: true, formatted: true },
      },
    ],
  });

/** A session enriched with parsed user-agent + geolocation (transform output). */
export interface GqlSession {
  id: string;
  userUID: string;
  provider: string;
  ipAddress: string | null;
  fingerprintID: string | null;
  createdAt: string;
  lastUpdatedAt: string | null;
  userAgent: {
    browser: string | null;
    os: string | null;
    formatted: string;
  } | null;
  location: {
    city: string | null;
    country: string | null;
    countryCode: string | null;
    formatted: string;
  } | null;
}
