/**
 * Declare our loaders and actions context type
 */
declare module 'react-router' {
  interface AppLoadContext {
    /**
     * The app version from the build assets
     */
    readonly appVersion: string;
  }
}

// Types for context generation
type BuildAssets = {
  version: string;
};

type ContextOptions = {
  mode: string;
  build: {
    assets: BuildAssets;
  };
};

// Create a function to generate the load context creator
export const createContextGenerator = <T>(
  createGetLoadContextFn: (callback: (request: T, options: ContextOptions) => any) => any
) => {
  return createGetLoadContextFn((_c: T, { mode, build }: ContextOptions) => {
    const isProductionMode = mode === 'production';
    return {
      appVersion: isProductionMode ? build.assets.version : 'dev',
    };
  });
};
