import { EnvVariables } from '@/server/iface';
import { Context } from 'hono';
import { createContext, RouterContextProvider } from 'react-router';

/**
 * Our loaders and actions context values, accessed via `context.get(...)`.
 */
export const appVersionContext = createContext<string>();
export const cspNonceContext = createContext<string>();
export const requestIdContext = createContext<string>();

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
    callback: (c: Context<Env>, options: ContextOptions) => RouterContextProvider
  ) => (c: Context<Env>, options: ContextOptions) => RouterContextProvider
) => {
  return createGetLoadContextFn((c: Context<Env>, { mode, build }) => {
    const isProductionMode = mode === 'production';
    const provider = new RouterContextProvider();
    provider.set(
      appVersionContext,
      isProductionMode ? (build?.assets?.version ?? 'production') : 'development'
    );
    provider.set(cspNonceContext, c.get('secureHeadersNonce'));
    provider.set(requestIdContext, c.get('requestId'));
    return provider;
  });
};
