// cypress/support/remixStub.tsx
import React from 'react';
import { createMemoryRouter, RouterProvider, RouteObject } from 'react-router';

const createRequest = (url: string = 'http://localhost:3000', init: RequestInit = {}) => {
  return new Request(url, init);
};

interface RemixStubProps {
  children: React.ReactNode;
  initialEntries?: string[];
  initialIndex?: number;
  path?: string;
  remixStubProps?: {
    data?: Record<string, any>;
    loaderData?: Record<string, any>;
    actionData?: Record<string, any> | null;
    errors?: Record<string, Error>;
    navigation?: {
      state: 'idle' | 'loading' | 'submitting';
      location?: any;
      formAction?: string;
      formMethod?: string;
      formEncType?: string;
      formData?: FormData;
    };
    fetchers?: Record<string, any>;
    navigate?: (...args: any[]) => void;
    request?: Request;
    [key: string]: any;
  };
}

const createDataFunctionArgs = (remixStubProps: any) => {
  const request = remixStubProps.request || createRequest();
  return {
    request,
    params: remixStubProps.params || {},
    context: remixStubProps.context || {},
  };
};

/**
 * Root context for React Router v7 + Remix — certain context values must be present.
 */
const RootContext = React.createContext({
  requestInfo: {
    url: 'http://localhost:3000',
    method: 'GET',
    headers: new Headers(),
    clientAddress: '127.0.0.1',
  },
  serverHandoff: {
    url: 'http://localhost:3000',
    state: {},
  },
});

/**
 * A stub component for testing Remix routes with React Router v7.
 */
export const RemixStub: React.FC<RemixStubProps> = ({
  children,
  initialEntries = ['/'],
  initialIndex = 0,
  path = '/',
  remixStubProps = {},
}) => {
  React.useEffect(() => {
    const mockStorage: Record<string, string> = {
      APP_URL: Cypress.env('APP_URL') || 'http://localhost:3000',
    };

    const sessionStorageMock = {
      getItem: (key: string) => mockStorage[key] || null,
      setItem: (key: string, value: string) => {
        mockStorage[key] = value;
      },
      removeItem: (key: string) => {
        delete mockStorage[key];
      },
      clear: () => {
        Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
      },
      length: Object.keys(mockStorage).length,
      key: (index: number) => Object.keys(mockStorage)[index] || null,
    };

    cy.stub(window, 'sessionStorage').value(sessionStorageMock);

    if (remixStubProps.navigate) {
      cy.stub(window as any, 'navigate').callsFake(remixStubProps.navigate);
    }
  }, [remixStubProps.navigate]);

  const dataFunctionArgs = createDataFunctionArgs(remixStubProps);

  const routes: RouteObject[] = [
    {
      id: 'root',
      path: '/',
      loader: async () => ({
        requestInfo: {
          url: dataFunctionArgs.request.url,
          method: dataFunctionArgs.request.method,
          headers: Object.fromEntries([...dataFunctionArgs.request.headers.entries()]),
          clientAddress: '127.0.0.1',
        },
        ...remixStubProps.rootLoaderData,
      }),
      children: [
        {
          path,
          element: children,
          loader: async () => remixStubProps.loaderData || {},
          action: async () => remixStubProps.actionData || null,
          errorElement: remixStubProps.errorElement,
        },
      ],
    },
  ];

  const router = createMemoryRouter(routes, {
    initialEntries,
    initialIndex,
  });

  if (remixStubProps.navigation) {
    // @ts-ignore - Accessing internal properties for testing
    router.state.navigation = remixStubProps.navigation;
  }

  const requestInfoValue = {
    requestInfo: {
      url: dataFunctionArgs.request.url,
      method: dataFunctionArgs.request.method,
      headers: dataFunctionArgs.request.headers,
      clientAddress: '127.0.0.1',
    },
    serverHandoff: {
      url: dataFunctionArgs.request.url,
      state: remixStubProps.handoffState || {},
    },
  };

  return (
    <RootContext.Provider value={requestInfoValue}>
      <RouterProvider router={router} />
    </RootContext.Provider>
  );
};

export const createRemixStubWrapper = (remixStubOptions: Omit<RemixStubProps, 'children'> = {}) => {
  // eslint-disable-next-line react/display-name
  return (ui: React.ReactNode) => <RemixStub {...remixStubOptions}>{ui}</RemixStub>;
};
