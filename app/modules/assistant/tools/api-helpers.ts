import { env } from '@/utils/config/env.server';
import { logger } from '@/utils/logger';

interface ApiResponse {
  data?: any;
  error?: string;
}

export async function datumGet(path: string, token: string): Promise<any> {
  const url = `${env.API_URL}${path}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    logger.warn('assistant tool API error', {
      method: 'GET',
      url: path,
      status: res.status,
      body: body.slice(0, 500),
    });
    return { error: `API ${res.status}: ${tryParseMessage(body) || res.statusText}` };
  }

  return res.json();
}

export async function datumPost(path: string, body: unknown, token: string): Promise<any> {
  const url = `${env.API_URL}${path}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    const respBody = await res.text().catch(() => '');
    logger.warn('assistant tool API error', {
      method: 'POST',
      url: path,
      status: res.status,
      body: respBody.slice(0, 500),
    });
    return { error: `API ${res.status}: ${tryParseMessage(respBody) || res.statusText}` };
  }

  return res.json();
}

function tryParseMessage(body: string): string | undefined {
  try {
    const parsed = JSON.parse(body);
    return parsed?.message || parsed?.reason || parsed?.error;
  } catch {
    return undefined;
  }
}
