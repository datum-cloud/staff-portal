/// <reference types="bun-types/test" />
import { proxyWatch } from './watch';
import { afterAll, describe, expect, test } from 'bun:test';

const CYCLES = 200;
const EVENTS_PER_CYCLE = 10;
const EVENT = `${JSON.stringify({
  type: 'ADDED',
  object: { kind: 'Activity', metadata: { name: 'a'.repeat(4096) } },
})}\n`;

const upstream = Bun.serve({
  port: 0,
  fetch() {
    const body = new ReadableStream<Uint8Array>({
      async pull(controller) {
        controller.enqueue(new TextEncoder().encode(EVENT));
        await Bun.sleep(0);
      },
    });

    return new Response(body, { headers: { 'Content-Type': 'application/json' } });
  },
});

const url = `http://localhost:${upstream.port}/apis/activity/v1alpha1/activities?watch=true`;

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
  const before = process.memoryUsage().heapUsed;

  for (let i = 0; i < CYCLES; i++) await watchCycle(retain);

  await settle();

  return (process.memoryUsage().heapUsed - before) / CYCLES;
}

async function settle() {
  Bun.gc(true);
  await Bun.sleep(50);
  Bun.gc(true);
}

afterAll(() => upstream.stop(true));

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
