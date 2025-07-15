import { createZitadelStrategy } from './strategies/zitadel.server';
import { AuthProvider } from './types';

// Available authentication providers
export const authProviders: AuthProvider[] = [
  {
    name: 'Zitadel',
    strategy: 'zitadel',
    createStrategy: async () => {
      const result = await createZitadelStrategy();
      return {
        strategy: result.strategy,
        isFallback: result.isFallback,
        error: result.error,
      };
    },
  },
  // Add more providers here as needed:
  // {
  //   name: 'Google',
  //   strategy: 'google',
  //   createStrategy: async () => {
  //     const result = await createGoogleStrategy();
  //     return {
  //       strategy: result.strategy,
  //       isFallback: result.isFallback,
  //       error: result.error,
  //     };
  //   },
  // },
];
