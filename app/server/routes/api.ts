import { authenticator } from '@/modules/auth/auth.server';
import { apiRequest } from '@/modules/axios/axios.server';
import { env } from '@/utils/config/env.server';
import { AuthenticationError } from '@/utils/errors';
import { AxiosError } from 'axios';
import { Hono } from 'hono';

const API_BASENAME = '/api';

// Create an API Hono app
const api = new Hono();

api.get('/', async (c) => {
  return c.json({ message: 'Staff API' });
});

// Internal proxy route - catch-all for /api/internal/*
api.all('/internal/*', async (c) => {
  // Get cookies from the request
  const cookieHeader = c.req.header('Cookie');

  // Create a Request object from Hono context to use with existing auth utilities
  const request = new Request(c.req.url, {
    method: c.req.method,
    headers: {
      Cookie: cookieHeader || '',
      ...c.req.header(),
    },
  });

  const path = c.req.path.replace(/^\/api\/internal/, '').replace(/^\//, '');

  try {
    // Check if user is authenticated
    const isAuthenticated = await authenticator.isAuthenticated(request);
    if (!isAuthenticated) {
      throw new AuthenticationError('Authentication required');
    }

    // Get the session with access token
    const session = await authenticator.getSession(request);
    if (!session?.accessToken) {
      throw new AuthenticationError('No access token available');
    }

    // Get the path after /api/internal/

    // Get query parameters
    const searchParams = c.req.query();
    const queryString = new URLSearchParams(searchParams).toString();
    const fullTargetUrl = queryString ? `${path}?${queryString}` : path;

    // Prepare headers for the proxy request
    const headers: Record<string, string> = {
      Authorization: `Bearer ${session.accessToken}`,
    };

    // Forward content type if present
    const contentType = c.req.header('Content-Type');
    if (contentType) {
      headers['Content-Type'] = contentType;
    }

    // Forward accept header if present
    const accept = c.req.header('Accept');
    if (accept) {
      headers['Accept'] = accept;
    }

    // Forward user agent if present
    const userAgent = c.req.header('User-Agent');
    if (userAgent) {
      headers['User-Agent'] = userAgent;
    }

    // Prepare request body for non-GET requests
    let requestBody: string | undefined;
    if (c.req.method !== 'GET' && c.req.method !== 'HEAD') {
      requestBody = await c.req.text();
    }

    // Forward the request to the actual API
    const response = await apiRequest({
      method: c.req.method,
      url: fullTargetUrl,
      headers,
      ...(requestBody && { data: requestBody }),
    }).execute();

    // Return the response with appropriate headers
    return c.json(
      {
        code: 'PROXY_REQUEST_SUCCESS',
        data: response,
        path,
      },
      200,
      {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      }
    );
  } catch (error) {
    if (env.isDebug) {
      console.error('Internal proxy error:', error);
    }

    // Handle different types of errors
    if (error instanceof AuthenticationError) {
      return c.json(
        {
          code: error.code,
          error: error.message,
          path,
        },
        401
      );
    }

    if (error instanceof AxiosError) {
      return c.json(
        {
          code: 'PROXY_REQUEST_FAILED',
          error: error.response?.data?.message || error.message,
          path,
        },
        (error?.status as any) || 500
      );
    }

    if (error instanceof Response) {
      const body = await error.json();
      return c.json(
        {
          code: error.statusText,
          error: body?.message || error.statusText,
          path,
        },
        (error?.status as any) || 500
      );
    }

    if (typeof error === 'string') {
      return c.json(
        {
          code: 'PROXY_REQUEST_FAILED',
          error: error,
          path,
        },
        500
      );
    }

    // Return a generic error response
    return c.json(
      {
        code: 'PROXY_REQUEST_FAILED',
        error: error instanceof Error ? error.message : 'Unknown error',
        path,
      },
      500
    );
  }
});

export { api, API_BASENAME };
