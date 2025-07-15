import { CustomAuthenticator } from './authenticator';
import { authProviders } from './providers';
import { AuthProviderResult } from './types';

interface StatusSummary {
  success: AuthProviderResult[];
  fallback: AuthProviderResult[];
  failed: AuthProviderResult[];
}

/**
 * Initialize all configured authentication providers
 */
export async function initializeAuthenticator(authenticator: CustomAuthenticator): Promise<void> {
  const results = await Promise.allSettled(
    authProviders.map(async (provider): Promise<AuthProviderResult> => {
      try {
        const result = await provider.createStrategy();
        authenticator.use(result.strategy, provider.strategy);

        if (result.isFallback) {
          console.warn(
            `⚠️  ${provider.name} strategy initialized with fallback (OIDC issuer not accessible)`
          );
          return { provider: provider.name, status: 'fallback', error: result.error };
        } else {
          console.log(`✅ ${provider.name} strategy initialized successfully`);
          return { provider: provider.name, status: 'success' };
        }
      } catch (error) {
        console.warn(`⚠️  Failed to initialize ${provider.name} strategy:`, error);
        return {
          provider: provider.name,
          status: 'failed',
          error: error instanceof Error ? error : new Error(String(error)),
        };
      }
    })
  );

  const summary = categorizeResults(results);
  logSummary(summary);
}

function categorizeResults(results: PromiseSettledResult<AuthProviderResult>[]): StatusSummary {
  const summary: StatusSummary = { success: [], fallback: [], failed: [] };

  results.forEach((result) => {
    if (result.status === 'fulfilled') {
      summary[result.value.status].push(result.value);
    } else {
      summary.failed.push({ provider: 'unknown', status: 'failed', error: result.reason });
    }
  });

  return summary;
}

function logSummary(summary: StatusSummary): void {
  const { success, fallback, failed } = summary;

  if (success.length > 0) {
    console.log(`✅ ${success.length} authentication provider(s) initialized successfully`);
  }

  if (fallback.length > 0) {
    console.warn(
      `⚠️  ${fallback.length} authentication provider(s) initialized with fallback (OIDC not accessible)`
    );
  }

  if (failed.length > 0) {
    console.warn(`⚠️  ${failed.length} authentication provider(s) failed to initialize`);
  }

  if (success.length === 0 && fallback.length === 0) {
    console.error(`❌ No authentication providers were initialized successfully`);
  }
}
