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
    console.error(err);
  } else {
    console.info(command);
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

  // this error mostly comes from forward proxy server
  switch (error.response?.status) {
    case 401: {
      const data = error.response?.data as { error: string; code: string };
      if (data.code === 'AUTH_ERROR') {
        window.location.href = '/logout';
      }
    }
  }

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
