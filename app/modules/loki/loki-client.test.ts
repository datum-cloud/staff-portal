import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { GrafanaApi } from '@myunisoft/loki';
import { MockAgent, getGlobalDispatcher, setGlobalDispatcher } from 'undici';
import type { Dispatcher } from 'undici';
import { gzipSync } from 'node:zlib';

import { executeLokiQuery } from './loki-client';

describe('executeLokiQuery', () => {
  const baseUrl = 'https://telemetry.example.com';
  const mockAgent = new MockAgent();
  const mockPool = mockAgent.get(baseUrl);
  let previousDispatcher: Dispatcher;

  beforeAll(() => {
    previousDispatcher = getGlobalDispatcher();
    mockAgent.disableNetConnect();
    setGlobalDispatcher(mockAgent);
  });

  afterAll(async () => {
    setGlobalDispatcher(previousDispatcher);
    await mockAgent.close();
  });

  it('decompresses gzip encoded Loki responses before parsing', async () => {
    const lokiPayload = {
      status: 'success',
      data: {
        resultType: 'streams',
        result: [
          {
            stream: {
              job: 'telemetry',
            },
            values: [['2000000', '{"message":"decoded"}']],
          },
        ],
      },
    };

    mockPool
      .intercept({
        path: '/loki/api/v1/query_range',
        method: 'GET',
      })
      .reply(200, gzipSync(JSON.stringify(lokiPayload)), {
        headers: {
          'content-type': 'application/json',
          'content-encoding': 'gzip',
        },
      });

    const client = new GrafanaApi({
      remoteApiURL: baseUrl,
      authentication: {
        type: 'bearer',
        token: 'test-token',
      },
    });

    const response = await executeLokiQuery(client, '{app="portal"}', {
      start: '1000000',
      end: '3000000',
      limit: 100,
    });

    expect(response.logs).toEqual(['{"message":"decoded"}']);
    expect(response.timerange).toEqual([2, 2]);
  });
});
