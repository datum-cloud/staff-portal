import { EnvVariables } from '@/server/iface';
import { Context } from 'hono';
import type { AppLoadContext } from 'react-router';

/**
 * Declare our loaders and actions context type
 */
declare module 'react-router' {
  interface AppLoadContext {
    /**
     * The app version from the build assets
     */
    readonly appVersion: string;

    /**
     * The CSP nonce
     */
    readonly cspNonce: string;

    /**
     * The request ID
     */
    readonly requestId: string;
  }
}

// Types for context generation
type ContextOptions = {
  mode: string;
  build: {
    assets: {
      version: string;
    };
  };
};

// Create a function to generate the load context creator
export const createContextGenerator = <Env extends { Variables: EnvVariables }>(
  createGetLoadContextFn: (
    callback: (c: Context<Env>, options: ContextOptions) => AppLoadContext
  ) => (c: Context<Env>, options: ContextOptions) => AppLoadContext
) => {
  return createGetLoadContextFn((c: Context<Env>, { mode, build }) => {
    const isProductionMode = mode === 'production';
    return {
      appVersion: isProductionMode ? (build?.assets?.version ?? 'production') : 'development',
      cspNonce: c.get('secureHeadersNonce'),
      requestId: c.get('requestId'),
    };
  });
};
