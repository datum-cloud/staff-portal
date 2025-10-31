import { vi } from 'vitest';

let __builder: any;
let __apiRequestClient: any;

export type AxiosRequestMock = {
  readonly apiRequestClient: any;
  readonly __builder: any;
};

export const mockRequestClient = (): AxiosRequestMock => {
  vi.mock('@/modules/axios/axios.client', () => {
    __builder = {
      input: vi.fn().mockReturnThis(),
      output: vi.fn().mockReturnThis(),
      execute: vi.fn().mockResolvedValue({ data: { ok: true } }),
    };
    __apiRequestClient = vi.fn(() => __builder as any);
    return { apiRequestClient: __apiRequestClient, __builder } as any;
  });

  return {
    get apiRequestClient() {
      return __apiRequestClient;
    },
    get __builder() {
      return __builder;
    },
  } as AxiosRequestMock as any;
};

export const mockLogger = () => {
  vi.mock('@/utils/logger', async (importOriginal) => {
    const actual = (await importOriginal()) as Record<string, unknown>;
    return {
      ...(actual as object),
      captureApiError: vi.fn(),
      logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
    } as any;
  });
};

export const importAfterMocks = async <T>(modulePath: string): Promise<T> => {
  return (await import(modulePath)) as T;
};
