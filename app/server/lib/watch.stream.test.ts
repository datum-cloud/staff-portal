import { proxyWatch } from './watch';
import { serve, type ServerType } from '@hono/node-server';
import { Hono } from 'hono';
import { createServer, type IncomingMessage } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

const INTERVAL_MS = 200;

const event = (n: number) => `${JSON.stringify({ type: 'MODIFIED', object: { n } })}\n`;

const upstreamRequests: IncomingMessage[] = [];
const upstreamClosed: Promise<void>[] = [];

const upstream = createServer((req, res) => {
  upstreamRequests.push(req);
  res.writeHead(200, { 'Content-Type': 'application/json' });
  let n = 0;
  res.write(event(n++));
  const timer = setInterval(() => res.write(event(n++)), INTERVAL_MS);
  upstreamClosed.push(
    new Promise((resolve) =>
      res.once('close', () => {
        clearInterval(timer);
        resolve();
      })
    )
  );
});

let upstreamUrl: string;
let proxy: ServerType;
let proxyUrl: string;

beforeAll(async () => {
  await new Promise<void>((resolve) => upstream.listen(0, '127.0.0.1', resolve));
  upstreamUrl = `http://127.0.0.1:${(upstream.address() as AddressInfo).port}`;

  const app = new Hono();
  app.get('/watch', (c) =>
    proxyWatch({
      url: `${upstreamUrl}/apis/activity/v1alpha1/activities?watch=true`,
      method: 'GET',
      headers: { Authorization: 'Bearer token' },
      requestId: 'req-stream',
      signal: c.req.raw.signal,
    })
  );
  await new Promise<void>((resolve) => {
    proxy = serve({ fetch: app.fetch, port: 0, hostname: '127.0.0.1' }, (info) => {
      proxyUrl = `http://127.0.0.1:${info.port}`;
      resolve();
    });
  });
});

afterAll(() => {
  upstream.closeAllConnections();
  upstream.close();
  proxy.close();
});

describe('proxyWatch streaming on Node', () => {
  test('relays each event as the upstream writes it, then closes the upstream on disconnect', async () => {
    const client = new AbortController();
    const started = Date.now();
    const response = await fetch(`${proxyUrl}/watch`, { signal: client.signal });

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-cache, no-store, must-revalidate');
    expect(upstreamRequests.at(-1)?.headers['x-request-id']).toBe('req-stream');

    const reader = response.body!.pipeThrough(new TextDecoderStream()).getReader();
    const arrivals: { at: number; n: number }[] = [];
    let buffer = '';
    while (arrivals.length < 4) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += value;
      let newline: number;
      while ((newline = buffer.indexOf('\n')) >= 0) {
        arrivals.push({
          at: Date.now() - started,
          n: JSON.parse(buffer.slice(0, newline)).object.n,
        });
        buffer = buffer.slice(newline + 1);
      }
    }

    expect(arrivals.map((a) => a.n)).toEqual([0, 1, 2, 3]);
    expect(arrivals[0].at).toBeLessThan(INTERVAL_MS);
    expect(arrivals[3].at).toBeGreaterThanOrEqual(3 * INTERVAL_MS - 50);

    client.abort();
    await reader.cancel().catch(() => {});

    const closed = await Promise.race([
      upstreamClosed.at(-1)!.then(() => true),
      new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 2_000)),
    ]);
    expect(closed).toBe(true);
  }, 10_000);
});
