import { proxyWatch } from './watch';
import { serve, type ServerType } from '@hono/node-server';
import { Hono, type Context } from 'hono';
import { createServer, type IncomingMessage } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

const INTERVAL_MS = 200;

const event = (n: number) => `${JSON.stringify({ type: 'MODIFIED', object: { n } })}\n`;

const upstreamRequests: IncomingMessage[] = [];
const upstreamClosed: Promise<void>[] = [];
// When the upstream wrote each event, on the same clock as the client's reads.
const written: number[] = [];

const upstream = createServer((req, res) => {
  upstreamRequests.push(req);
  res.writeHead(200, { 'Content-Type': 'application/json' });
  upstreamClosed.push(new Promise<void>((resolve) => res.once('close', resolve)));

  let timer: ReturnType<typeof setInterval> | undefined;
  res.once('close', () => clearInterval(timer));

  // One event, then the response stays open: a client that receives it has been
  // handed the event without waiting for more upstream data.
  res.write(event(0));
  written.push(Date.now());
  if (req.url?.includes('single=true')) return;

  let n = 1;
  timer = setInterval(() => res.write(event(n++)), INTERVAL_MS);
});

let upstreamUrl: string;
let proxy: ServerType;
let proxyUrl: string;

beforeAll(async () => {
  await new Promise<void>((resolve) => upstream.listen(0, '127.0.0.1', resolve));
  upstreamUrl = `http://127.0.0.1:${(upstream.address() as AddressInfo).port}`;

  const app = new Hono();
  const route = (query: string) => (c: Context) =>
    proxyWatch({
      url: `${upstreamUrl}/apis/activity/v1alpha1/activities?watch=true${query}`,
      method: 'GET',
      headers: { Authorization: 'Bearer token' },
      requestId: 'req-stream',
      signal: c.req.raw.signal,
    });
  app.get('/watch', route(''));
  app.get('/watch-single', route('&single=true'));

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

const closeUpstream = (index: number) =>
  Promise.race([
    upstreamClosed[index].then(() => true),
    new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 2_000)),
  ]);

describe('proxyWatch streaming on Node', () => {
  test('relays an event the upstream writes while its response stays open, then closes the upstream on disconnect', async () => {
    const writeIndex = written.length;
    const client = new AbortController();
    const response = await fetch(`${proxyUrl}/watch-single`, { signal: client.signal });

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-cache, no-store, must-revalidate');
    expect(upstreamRequests.at(-1)?.headers['x-request-id']).toBe('req-stream');

    const reader = response.body!.pipeThrough(new TextDecoderStream()).getReader();
    const { value, done } = await reader.read();
    const receivedAt = Date.now();
    expect(done).toBe(false);
    if (!value) throw new Error('the proxy relayed no event');
    expect(JSON.parse(value.trim()).object.n).toBe(0);

    // The delay is one loopback hop, measured from the upstream's own write, so
    // it does not grow with how busy the machine is the way a bound taken before
    // the connection opened does. A relay that flushes on a timer longer than the
    // interval, or that holds the event until more arrives, fails here.
    expect(receivedAt - written[writeIndex]).toBeLessThan(INTERVAL_MS);

    client.abort();
    await reader.cancel().catch(() => {});
    expect(await closeUpstream(0)).toBe(true);
  }, 10_000);

  test('relays successive events in the order the upstream writes them, then closes the upstream on disconnect', async () => {
    const client = new AbortController();
    const started = Date.now();
    const response = await fetch(`${proxyUrl}/watch`, { signal: client.signal });

    expect(response.status).toBe(200);

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
    // Only a lower bound: a loaded runner delivers the events late, never early.
    expect(arrivals[3].at).toBeGreaterThanOrEqual(3 * INTERVAL_MS - 50);

    client.abort();
    await reader.cancel().catch(() => {});
    expect(await closeUpstream(1)).toBe(true);
  }, 10_000);
});
