import { OAuth2Strategy } from 'remix-auth-oauth2';

export interface ISession {
  sub: string;
  idToken: string;
  accessToken: string;
  refreshToken: string | null;
  expiredAt: Date;
}

export interface AuthProvider {
  name: string;
  strategy: string;
  createStrategy: () => Promise<{ strategy: any; isFallback: boolean; error?: Error }>;
}

export interface AuthProviderResult {
  provider: string;
  status: 'success' | 'fallback' | 'failed';
  error?: Error;
}

export interface OAuthStrategyResult<T> {
  strategy: OAuth2Strategy<T>;
  isFallback: boolean;
  error?: Error;
}
