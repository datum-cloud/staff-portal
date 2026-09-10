import { isWatchRequest, proxyWatch } from '@/server/lib/watch';

function fakeWatchUpstream() {
  const encoder = new TextEncoder();
  const requests: { url: string; init: RequestInit | undefined }[] = [];
  let controller: ReadableStreamDefaultController<Uint8Array>;
  let cancelled = false;

  const upstreamBody = new ReadableStream<Uint8Array>({
    start(c) {
      controller = c;
    },
    cancel() {
      cancelled = true;
    },
  });

  const fetchImpl = ((url: string, init: RequestInit) => {
    requests.push({ url: String(url), init });

    return Promise.resolve(
      new Response(upstreamBody, {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );
  }) as unknown as typeof fetch;

  return {
    fetchImpl,
    requests,
    send: (event: unknown) => controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`)),
    drop: () => controller.close(),
    wasCancelled: () => cancelled,
  };
}

function watchOptions(signal: AbortSignal) {
  return {
    url: 'https://api.test/apis/activity/v1alpha1/activities?watch=true',
    method: 'GET',
    headers: { Authorization: 'Bearer token' },
    requestId: 'req-123',
    signal,
  };
}

async function readLine(reader: ReadableStreamDefaultReader<Uint8Array>) {
  const { value, done } = await reader.read();

  return { text: done ? '' : new TextDecoder().decode(value), done };
}

describe('isWatchRequest', () => {
  it('detects the values a Kubernetes client sends for a watch', () => {
    expect(isWatchRequest('true')).to.equal(true);
    expect(isWatchRequest('TRUE')).to.equal(true);
    expect(isWatchRequest('1')).to.equal(true);
  });

  it('returns false when the parameter is absent', () => {
    expect(isWatchRequest(undefined)).to.equal(false);
  });

  it('returns false for values that disable the watch', () => {
    expect(isWatchRequest('')).to.equal(false);
    expect(isWatchRequest('false')).to.equal(false);
    expect(isWatchRequest('FALSE')).to.equal(false);
    expect(isWatchRequest('0')).to.equal(false);
  });
});

describe('proxyWatch', () => {
  it('answers before any event arrives and forwards each one as it is sent', async () => {
    const upstream = fakeWatchUpstream();
    const response = await proxyWatch(
      watchOptions(new AbortController().signal),
      upstream.fetchImpl
    );

    expect(response.status).to.equal(200);
    expect(response.headers.get('Cache-Control')).to.equal('no-cache, no-store, must-revalidate');

    const reader = response.body!.getReader();

    upstream.send({ type: 'ADDED', object: { name: 'first' } });
    expect((await readLine(reader)).text).to.contain('"first"');

    upstream.send({ type: 'MODIFIED', object: { name: 'second' } });
    expect((await readLine(reader)).text).to.contain('"second"');
  });

  it('ends the response quietly when the upstream drops', async () => {
    const upstream = fakeWatchUpstream();
    const response = await proxyWatch(
      watchOptions(new AbortController().signal),
      upstream.fetchImpl
    );
    const reader = response.body!.getReader();

    upstream.send({ type: 'ADDED', object: { name: 'first' } });
    await readLine(reader);
    upstream.drop();

    expect((await readLine(reader)).done).to.equal(true);
    expect(response.status).to.equal(200);
  });

  it('releases the upstream stream when the client goes away', async () => {
    const upstream = fakeWatchUpstream();
    const controller = new AbortController();
    const response = await proxyWatch(watchOptions(controller.signal), upstream.fetchImpl);

    upstream.send({ type: 'ADDED', object: { name: 'first' } });
    controller.abort();
    await response.body!.cancel();

    expect(upstream.wasCancelled()).to.equal(true);
    expect(upstream.requests[0].init!.signal).to.equal(controller.signal);
  });

  it('stamps the request id the buffered path also sends', async () => {
    const upstream = fakeWatchUpstream();

    await proxyWatch(watchOptions(new AbortController().signal), upstream.fetchImpl);

    const sent = upstream.requests[0].init!.headers as Record<string, string>;
    expect(sent['X-Request-ID']).to.equal('req-123');
    expect(sent.Authorization).to.equal('Bearer token');
  });
});
