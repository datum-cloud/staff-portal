import { CustomAuthenticator } from './authenticator';
import { authProviders } from './providers';
import { AuthProviderResult } from './types';
import { logger } from '@/utils/logger';

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
          logger.warn(
            `${provider.name} strategy initialized with fallback (OIDC issuer not accessible)`,
            {
              provider: provider.name,
              error: result.error,
            }
          );
          return { provider: provider.name, status: 'fallback', error: result.error };
        } else {
          logger.info(`${provider.name} strategy initialized successfully`, {
            provider: provider.name,
          });
          return { provider: provider.name, status: 'success' };
        }
      } catch (error) {
        logger.warn(`Failed to initialize ${provider.name} strategy`, {
          provider: provider.name,
          error: error instanceof Error ? error.message : String(error),
        });
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
    logger.info(`${success.length} authentication provider(s) initialized successfully`, {
      count: success.length,
      providers: success.map((s) => s.provider),
    });
  }

  if (fallback.length > 0) {
    logger.warn(
      `${fallback.length} authentication provider(s) initialized with fallback (OIDC not accessible)`,
      {
        count: fallback.length,
        providers: fallback.map((s) => s.provider),
      }
    );
  }

  if (failed.length > 0) {
    logger.warn(`${failed.length} authentication provider(s) failed to initialize`, {
      count: failed.length,
      providers: failed.map((s) => s.provider),
    });
  }

  if (success.length === 0 && fallback.length === 0) {
    logger.error(`No authentication providers were initialized successfully`, {
      totalProviders: success.length + fallback.length + failed.length,
      failedProviders: failed.map((s) => s.provider),
    });
  }
}
