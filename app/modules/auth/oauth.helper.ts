import { AuthenticationError } from '@/utils/errors';
import { OAuth2Strategy } from 'remix-auth-oauth2';
import { CodeChallengeMethod } from 'remix-auth-oauth2';

export interface OAuthFallbackConfig {
  clientId: string;
  clientSecret: string | null;
  authorizationEndpoint: string;
  tokenEndpoint: string;
  tokenRevocationEndpoint: string;
  redirectURI: string;
  scopes: string[];
  codeChallengeMethod: CodeChallengeMethod;
}

export interface OAuthProviderConfig {
  name: string;
  issuer?: string;
  clientId: string;
  clientSecret?: string;
  redirectURI: string;
  scopes: string[];
  endpoints?: {
    authorization?: string;
    token?: string;
    revocation?: string;
  };
}

export interface OAuthStrategyResult<T> {
  strategy: OAuth2Strategy<T>;
  isFallback: boolean;
  error?: Error;
}

export async function createOAuthStrategyWithFallback<T>(
  strategyName: string,
  createStrategy: () => Promise<OAuth2Strategy<T>>,
  fallbackConfig: OAuthFallbackConfig,
  StrategyClass: {
    new (config: any, callback: any): OAuth2Strategy<T>;
    discover<T>(issuer: string, config: any, callback: any): Promise<OAuth2Strategy<T>>;
  }
): Promise<OAuthStrategyResult<T>> {
  try {
    const strategy = await createStrategy();
    return { strategy, isFallback: false };
  } catch (error) {
    console.warn(`⚠️  Failed to discover ${strategyName} OIDC configuration:`, error);
    console.warn(`⚠️  Authentication will not be available until OIDC issuer is accessible`);

    const fallbackStrategy = new StrategyClass(fallbackConfig, async () => {
      throw new AuthenticationError('OIDC issuer is not accessible. Please try again later.');
    });

    return {
      strategy: fallbackStrategy,
      isFallback: true,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}

export function createOAuthFallbackConfig(config: OAuthProviderConfig): OAuthFallbackConfig {
  const baseUrl = config.issuer || '';

  return {
    clientId: config.clientId,
    clientSecret: config.clientSecret ?? null,
    authorizationEndpoint: config.endpoints?.authorization || `${baseUrl}/oauth/v2/authorize`,
    tokenEndpoint: config.endpoints?.token || `${baseUrl}/oauth/v2/token`,
    tokenRevocationEndpoint: config.endpoints?.revocation || `${baseUrl}/oauth/v2/revoke`,
    redirectURI: config.redirectURI,
    scopes: config.scopes,
    codeChallengeMethod: CodeChallengeMethod.S256,
  };
}

export async function createGenericOAuthProvider<T>(
  config: OAuthProviderConfig,
  StrategyClass: {
    new (config: any, callback: any): OAuth2Strategy<T>;
    discover<T>(issuer: string, config: any, callback: any): Promise<OAuth2Strategy<T>>;
  },
  callback: (params: any) => Promise<T>
): Promise<OAuthStrategyResult<T>> {
  const fallbackConfig = createOAuthFallbackConfig(config);

  return createOAuthStrategyWithFallback(
    config.name,
    () =>
      StrategyClass.discover<T>(
        config.issuer!,
        {
          clientId: config.clientId,
          clientSecret: config.clientSecret ?? null,
          redirectURI: config.redirectURI,
          scopes: config.scopes,
        },
        callback
      ),
    fallbackConfig,
    StrategyClass
  );
}
