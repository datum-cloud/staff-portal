import { onResponseError } from './axios.client';
import { toast } from '@datum-cloud/datum-ui/toast';
import { AxiosError, AxiosHeaders } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@datum-cloud/datum-ui/toast', () => ({ toast: { error: vi.fn() } }));
vi.mock('@/utils/logger', () => ({
  logger: { error: vi.fn(), debug: vi.fn() },
  captureApiError: vi.fn(),
}));
vi.mock('./auth-error-redirect', () => ({ getAuthErrorRedirectUrl: () => undefined }));

const failed = (skipErrorToast?: boolean) =>
  new AxiosError(
    'request failed',
    '422',
    { headers: new AxiosHeaders(), skipErrorToast },
    undefined,
    {
      status: 422,
      statusText: '',
      headers: {},
      config: { headers: new AxiosHeaders() },
      data: { message: 'spec.quantity: Invalid value' },
    }
  );

beforeEach(() => {
  vi.mocked(toast.error).mockClear();
  vi.stubGlobal('window', { location: { href: 'http://localhost/' } });
});

describe('onResponseError', () => {
  it('toasts a failed request', async () => {
    await expect(onResponseError(failed())).rejects.toBeInstanceOf(AxiosError);
    expect(toast.error).toHaveBeenCalledOnce();
  });

  it('leaves the toast to a caller that shows its own errors', async () => {
    await expect(onResponseError(failed(true))).rejects.toBeInstanceOf(AxiosError);
    expect(toast.error).not.toHaveBeenCalled();
  });
});
