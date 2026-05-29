import { parseK8sMessage } from '@/utils/errors';
import { logger } from '@/utils/logger';
import { captureApiError } from '@/utils/logger';
import { toast } from '@datum-cloud/datum-ui/toast';
import Axios, {
  AxiosError,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios';
import { z } from 'zod';

export const PROXY_URL = '/api/internal';

export const httpClient = Axios.create({
  timeout: 60 * 1000,
  baseURL: PROXY_URL,
});

function defaultLogCallback(curlResult: any, err: any) {
  const { command } = curlResult;
  if (err) {
    logger.error('Axios curl error', { error: err instanceof Error ? err.message : String(err) });
  } else {
    logger.debug('Axios curl command', { command });
  }
}

const onRequest = (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
  // console.info(`[request] [${JSON.stringify(config)}]`);
  return config;
};

const onRequestError = (error: AxiosError): Promise<AxiosError> => {
  // console.error(`[request error] [${JSON.stringify(error)}]`);
  return Promise.reject(error);
};

const onResponse = (response: AxiosResponse): AxiosResponse => {
  // console.info(`[response] [${JSON.stringify(response)}]`);
  return response;
};

// Extract error message from response
const getErrorMessage = (error: AxiosError): { message: string; requestId?: string } => {
  let raw: { message: string; requestId?: string } | undefined;

  // Try to get error message from response data
  if (error.response?.data) {
    const data = error.response.data as any;

    // Handle different response data structures
    if (typeof data === 'string') {
      raw = { message: data };
    } else if (typeof data === 'object') {
      const requestId = data.requestId;

      // Common error response formats - prioritize 'error' field for your API format
      if (data.error) raw = { message: data.error, requestId };
      else if (data.message) raw = { message: data.message, requestId };
      else if (data.detail) raw = { message: data.detail, requestId };
      else if (data.description) raw = { message: data.description, requestId };
      else {
        // If it's an object with error details, try to extract meaningful message
        const errorKeys = Object.keys(data).filter((key) =>
          ['message', 'error', 'detail', 'description', 'reason', 'cause'].includes(key)
        );
        if (errorKeys.length > 0) {
          raw = { message: data[errorKeys[0]], requestId };
        }
      }
    }
  }

  // Fallback to status text or generic message
  if (!raw) {
    raw = {
      message: error.response?.statusText || error.message || 'An unexpected error occurred',
    };
  }

  // Run K8s messages through the humanizer (strips admission-webhook
  // prefixes, swaps internal plurals for display labels). Non-K8s messages
  // pass through unchanged.
  return { ...raw, message: parseK8sMessage(raw.message) };
};

const onResponseError = (error: AxiosError): Promise<AxiosError> => {
  // console.error(`[response error] [${JSON.stringify(error)}]`);

  // Handle 401 AUTH_ERROR -> redirect to logout
  if (error.response?.status === 401) {
    const data = error.response?.data as { error: string; code: string };
    if (data.code === 'AUTH_ERROR') {
      window.location.href = '/logout';
      return Promise.reject(error);
    }
  }

  const errorInfo = getErrorMessage(error);

  // Capture API request errors to Sentry with proper context
  const sentryError = new Error(`API Request Failed: ${errorInfo.message}`);
  sentryError.name = 'ApiRequestError';

  captureApiError(sentryError, {
    url: error.config?.url,
    method: error.config?.method,
    status: error.response?.status,
    requestId: errorInfo?.requestId,
    responseData: error.response?.data,
  });

  // For all other errors, show toast with meaningful info
  const title = errorInfo.requestId ? `Request ID: ${errorInfo.requestId}` : 'Error';
  toast.error(title, { description: errorInfo.message });

  return Promise.reject(error);
};

httpClient.interceptors.request.use(onRequest, onRequestError);
httpClient.interceptors.response.use(onResponse, onResponseError);

interface RequestBuilder<TInput = unknown, TOutput = unknown> {
  input<T>(schema: z.ZodType<T>): RequestBuilder<T, TOutput>;
  output<T>(schema: z.ZodType<T>): RequestBuilder<TInput, T>;
  execute(): Promise<TOutput>;
}

export const apiRequestClient = (config: AxiosRequestConfig): RequestBuilder => {
  let inputSchema: z.ZodType | undefined;
  let outputSchema: z.ZodType | undefined;

  return {
    input(schema) {
      inputSchema = schema;
      return this as any;
    },
    output(schema) {
      outputSchema = schema;
      return this as any;
    },
    async execute() {
      if (inputSchema && config.data) {
        config.data = inputSchema.parse(config.data);
      }

      const response = await httpClient(config);

      // if (outputSchema) {
      //   return outputSchema.parse(response.data);
      // }

      return response.data;
    },
  };
};
