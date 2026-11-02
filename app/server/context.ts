import { EnvVariables } from '@/server/iface';
import { Context } from 'hono';
import { createContext, RouterContextProvider } from 'react-router';

/**
 * Typed loader and action context values.
 *
 * React Router v8 always passes a `RouterContextProvider` as the loader/action
 * `context`, so each value is its own context, read back with
 * `context.get(requestIdContext)`.
 */

/** The app version from the build assets */
export const appVersionContext = createContext<string>('development');

/** The CSP nonce */
export const cspNonceContext = createContext<string>('');

/** The request ID */
export const requestIdContext = createContext<string>('');

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
    const context = new RouterContextProvider();
    context.set(
      appVersionContext,
      isProductionMode ? (build?.assets?.version ?? 'production') : 'development'
    );
    context.set(cspNonceContext, c.get('secureHeadersNonce'));
    context.set(requestIdContext, c.get('requestId'));
    return context;
  });
};
