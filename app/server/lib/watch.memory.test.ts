import { proxyWatch } from './watch';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { setTimeout as sleep } from 'node:timers/promises';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

const CYCLES = 200;
const EVENTS_PER_CYCLE = 10;
const EVENT = `${JSON.stringify({
  type: 'ADDED',
  object: { kind: 'Activity', metadata: { name: 'a'.repeat(4096) } },
})}\n`;

const upstream = createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  const write = () => {
    while (!res.destroyed && res.write(EVENT));
    if (!res.destroyed) res.once('drain', write);
  };
  write();
});

let url: string;

beforeAll(async () => {
  await new Promise<void>((resolve) => upstream.listen(0, '127.0.0.1', resolve));
  const { port } = upstream.address() as AddressInfo;
  url = `http://127.0.0.1:${port}/apis/activity/v1alpha1/activities?watch=true`;
});

async function watchCycle(retain: Uint8Array[] | null) {
  const client = new AbortController();
  const response = await proxyWatch({
    url,
    method: 'GET',
    headers: { Authorization: 'Bearer token' },
    requestId: 'req-abc123',
    signal: client.signal,
  });

  const reader = response.body!.getReader();
  for (let i = 0; i < EVENTS_PER_CYCLE; i++) {
    const { value, done } = await reader.read();
    if (done) break;
    if (retain && value) retain.push(value);
  }

  client.abort();
  await reader.cancel().catch(() => {});
}

async function bytesRetainedPerCycle(retain: Uint8Array[] | null) {
  await settle();
  const before = retainedBytes();

  for (let i = 0; i < CYCLES; i++) await watchCycle(retain);

  await settle();

  return (retainedBytes() - before) / CYCLES;
}

function retainedBytes() {
  const { heapUsed, arrayBuffers } = process.memoryUsage();
  return heapUsed + arrayBuffers;
}

async function settle() {
  global.gc!();
  await sleep(50);
  global.gc!();
}

afterAll(() => {
  upstream.closeAllConnections();
  upstream.close();
});

describe('proxyWatch memory', () => {
  test('a reconnect loop retains far less than the events it carried', async () => {
    await bytesRetainedPerCycle(null);

    const held: Uint8Array[] = [];
    const leaking = await bytesRetainedPerCycle(held);
    held.length = 0;

    const streaming = await bytesRetainedPerCycle(null);

    expect(leaking).toBeGreaterThan(50_000);
    expect(streaming).toBeLessThan(4_000);
  }, 60_000);
});
