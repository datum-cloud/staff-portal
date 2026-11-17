import { defineConfig } from 'cypress';
import vitePreprocessor from 'cypress-vite';
import dotenv from 'dotenv';

dotenv.config();

// Set environment variables for test mode before any app code loads
process.env.CYPRESS = 'true';

export default defineConfig({
  env: {
    CYPRESS: 'true',
    APP_URL: process.env.CYPRESS_BASE_URL,
    ACCESS_TOKEN: process.env.ACCESS_TOKEN,
    SUB: process.env.SUB,
  },
  e2e: {
    baseUrl: process.env.CYPRESS_BASE_URL || 'http://localhost:3000',
    supportFile: 'cypress/support/e2e.ts',
    specPattern: 'cypress/e2e/{smoke,regression}/**/*.{cy,spec}.{js,jsx,ts,tsx}',
    viewportWidth: 1280,
    viewportHeight: 720,
    video: true,
    screenshotOnRunFailure: true,
    experimentalStudio: true,
    setupNodeEvents(on, config) {
      // Bundle e2e specs with Vite (not Cypress's default webpack/ts-loader,
      // which errors on TypeScript 6's deprecated `downlevelIteration`).
      on('file:preprocessor', vitePreprocessor());

      on('task', {
        log(message) {
          console.log(message);

          return null;
        },
        async signSessionCookie(sessionData: {
          accessToken: string;
          refreshToken?: string | null;
          expiredAt: string;
          sub: string;
        }) {
          // Seal the cookie the same way the app does
          // (see app/utils/cookies/base.ts + cipher.ts + session.ts).
          const { sealCookieValue } = await import('./app/utils/cookies/cipher');
          const sessionSecret = process.env.SESSION_SECRET;
          if (!sessionSecret) {
            throw new Error('SESSION_SECRET is required to build the login cookie');
          }

          // The app stores the payload as sealed JSON under the '_session' cookie.
          return sealCookieValue(JSON.stringify(sessionData), sessionSecret, '_session');
        },
      });

      return config;
    },
  },
  component: {
    devServer: {
      framework: 'react',
      bundler: 'vite',
    },
    viewportWidth: 1280,
    viewportHeight: 720,
    supportFile: 'cypress/support/component.tsx',
    indexHtmlFile: 'cypress/support/component-index.html',
    specPattern: 'cypress/component/**/*.{cy,spec}.{js,jsx,ts,tsx}',
  },
});
