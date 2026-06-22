import { defineConfig } from 'cypress';
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
      on('task', {
        log(message) {
          console.log(message);

          return null;
        },
        signSessionCookie(sessionData: {
          accessToken: string;
          refreshToken?: string | null;
          expiredAt: string;
          sub: string;
        }) {
          // Sign the cookie the same way the app does
          // (see app/utils/cookies/base.ts + session.ts).
          const { createCookie, createCookieSessionStorage } = require('react-router');
          const sessionSecret = process.env.SESSION_SECRET;
          const appUrl =
            process.env.APP_URL || process.env.CYPRESS_BASE_URL || 'http://localhost:3000';

          const sessionCookie = createCookie('_session', {
            path: '/',
            domain: new URL(appUrl).hostname,
            sameSite: 'lax',
            httpOnly: true,
            maxAge: 7 * 24 * 60 * 60, // matches SessionCookie.MAX_AGE
            secrets: [sessionSecret],
          });

          const sessionStorage = createCookieSessionStorage({
            cookie: sessionCookie,
          });

          // The app stores its payload under the '_session' key (BaseCookie.set).
          return sessionStorage
            .getSession()
            .then((session: ReturnType<typeof createCookieSessionStorage>['getSession']) => {
              session.set('_session', sessionData);
              return sessionStorage.commitSession(session);
            })
            .then((cookieHeader: string) => {
              // Extract just the cookie value from the Set-Cookie header.
              // Format: "_session=value; Path=/; ..."
              const match = cookieHeader.match(/^_session=([^;]+)/);
              return match ? match[1] : null;
            });
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
