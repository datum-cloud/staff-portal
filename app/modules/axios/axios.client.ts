import { toast } from '@/modules/toast';
import { logger } from '@/utils/logger';
import Axios, {
  AxiosError,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios';
import { z } from 'zod';

export const httpClient = Axios.create({
  timeout: 20 * 1000,
  baseURL: '/api/internal',
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

  // Extract error message from response
  const getErrorMessage = (error: AxiosError): { message: string; requestId?: string } => {
    // Try to get error message from response data
    if (error.response?.data) {
      const data = error.response.data as any;

      // Handle different response data structures
      if (typeof data === 'string') {
        return { message: data };
      }

      if (typeof data === 'object') {
        const requestId = data.requestId;

        // Common error response formats - prioritize 'error' field for your API format
        if (data.error) return { message: data.error, requestId };
        if (data.message) return { message: data.message, requestId };
        if (data.detail) return { message: data.detail, requestId };
        if (data.description) return { message: data.description, requestId };

        // If it's an object with error details, try to extract meaningful message
        const errorKeys = Object.keys(data).filter((key) =>
          ['message', 'error', 'detail', 'description', 'reason', 'cause'].includes(key)
        );
        if (errorKeys.length > 0) {
          return { message: data[errorKeys[0]], requestId };
        }
      }
    }

    // Fallback to status text or generic message
    return {
      message: error.response?.statusText || error.message || 'An unexpected error occurred',
    };
  };

  const errorInfo = getErrorMessage(error);

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
