// ***********************************************************
// Loaded automatically before component test files.
// Wraps mounted components with the same providers the app uses
// (Lingui i18n + TanStack Query + Router) so components render
// with real behavior — no module mocking.
// ***********************************************************
import { RemixStub } from './remixStub';
import { messages } from '@/modules/i18n/locales/en';
import '@/styles/root.css';
import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@testing-library/cypress/add-commands';
import { mount, MountOptions, MountReturn } from 'cypress/react';
import React, { ReactNode } from 'react';
import { MemoryRouter, MemoryRouterProps, Route, Routes } from 'react-router';

// Shiki (pulled in via datum-ui assistant) reads process.env in the browser.
// Cypress component tests do not define process, so stub a minimal one.
if (typeof globalThis.process === 'undefined') {
  (globalThis as typeof globalThis & { process: { env: Record<string, string | undefined> } }).process =
    { env: {} };
} else if (!globalThis.process.env) {
  globalThis.process.env = {};
}

// Activate Lingui once with real English translations.
i18n.loadAndActivate({ locale: 'en', messages });

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });

const TestProviders = ({ children }: { children: ReactNode }) => (
  <I18nProvider i18n={i18n}>
    <QueryClientProvider client={createTestQueryClient()}>{children}</QueryClientProvider>
  </I18nProvider>
);

declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Mounts a React node wrapped in app providers + a MemoryRouter route.
       * @param component React node to mount
       * @param options MountOptions plus { initialEntries, initialIndex, path }
       */
      mount(
        component: React.ReactNode,
        options?: MountOptions & MemoryRouterProps & { path?: string }
      ): Cypress.Chainable<MountReturn>;

      /**
       * Mounts a React node inside a Remix/React-Router v7 RouterProvider stub
       * with injectable loaderData / actionData / navigation.
       */
      mountRemixRoute(
        component: React.ReactNode,
        options?: {
          initialEntries?: string[];
          initialIndex?: number;
          path?: string;
          remixStubProps?: Record<string, unknown>;
          [key: string]: unknown;
        }
      ): Chainable<MountReturn>;
    }
  }
}

Cypress.Commands.add('mount', (component, options = {}) => {
  const {
    initialEntries = ['/'],
    initialIndex = 0,
    path = '/',
    ...mountOptions
  } = options as MemoryRouterProps & { path?: string } & MountOptions;

  const wrapped = (
    <TestProviders>
      <MemoryRouter initialEntries={initialEntries} initialIndex={initialIndex}>
        <Routes>
          <Route path={path} element={component as React.ReactElement} />
        </Routes>
      </MemoryRouter>
    </TestProviders>
  );

  return mount(wrapped, mountOptions);
});

Cypress.Commands.add(
  'mountRemixRoute',
  (
    component: React.ReactNode,
    options: MountOptions &
      MemoryRouterProps & {
        path?: string;
        remixStubProps?: Record<string, unknown>;
      } = {}
  ) => {
    const {
      initialEntries = ['/'],
      initialIndex = 0,
      path = '/',
      remixStubProps = {},
      ...mountOptions
    } = options;

    return mount(
      <TestProviders>
        <RemixStub
          initialEntries={initialEntries.map((entry) =>
            typeof entry === 'string' ? entry : entry.pathname || '/'
          )}
          initialIndex={initialIndex}
          path={path}
          remixStubProps={remixStubProps}>
          {component}
        </RemixStub>
      </TestProviders>,
      mountOptions
    );
  }
);
