// Main authenticator and initialization
export { authenticator, CustomAuthenticator } from './authenticator';
export { initializeAuthenticator } from './initializer';

// Main types
export type { ISession } from './types';

// OAuth utilities
export * from './oauth.helper';

// Strategies
export { createZitadelStrategy } from './strategies/zitadel.server';
export type { IZitadelResponse } from './strategies/zitadel.server';

// Internal components (for advanced usage)
export { authProviders } from './providers';
export type { AuthProvider, AuthProviderResult, OAuthStrategyResult } from './types';
