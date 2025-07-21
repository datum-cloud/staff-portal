import { AppError } from '@/utils/errors';
import { createRequestLogger } from '@/utils/logger';
import { AxiosError } from 'axios';

export interface ErrorLogContext {
  path: string;
  method: string;
  duration: number;
  userAgent?: string;
  ip?: string;
}

export interface ApiErrorDetails {
  errorType: string;
  errorCode?: string;
  statusCode?: number;
  message: string;
  context?: Record<string, any>;
}

export async function logApiError(
  logger: ReturnType<typeof createRequestLogger>,
  error: unknown,
  context: ErrorLogContext
): Promise<ApiErrorDetails> {
  const { path, method, duration, userAgent, ip } = context;

  let errorDetails: ApiErrorDetails;

  if (error instanceof AppError) {
    const appError = error as AppError;

    errorDetails = {
      errorType: appError.code || 'APP_ERROR',
      errorCode: appError.code,
      statusCode: appError.statusCode,
      message: appError.message,
      context: { path, method },
    };
  } else if (error instanceof AxiosError) {
    const statusCode = error.response?.status;
    const responseData = error.response?.data;

    errorDetails = {
      errorType: 'API_REQUEST',
      statusCode,
      message: `API request failed: ${responseData?.message || error.message}`,
      context: {
        path,
        method,
        statusCode,
        responseData,
        requestUrl: error.config?.url,
        requestMethod: error.config?.method,
      },
    };
  } else if (error instanceof Response) {
    // Try to extract error message from response body
    let responseMessage = error.statusText;
    let responseData: any = null;
    let errorCode = error.statusText; // Use status text as default error code

    try {
      // Clone the response to read the body (since it might be consumed)
      const clonedResponse = error.clone();
      responseData = await clonedResponse.json();

      // Handle different error response formats (K8s API, OAuth, etc.)
      if (responseData?.message) {
        responseMessage = responseData.message;
      } else if (responseData?.error) {
        responseMessage = responseData.error;
      } else if (responseData?.reason) {
        responseMessage = responseData.reason;
      } else if (responseData?.error_description) {
        responseMessage = responseData.error_description;
      } else if (responseData?.details?.message) {
        responseMessage = responseData.details.message;
      } else if (typeof responseData === 'string') {
        responseMessage = responseData;
      }

      // Extract error code from response data
      if (responseData?.error) {
        errorCode = responseData.error;
      } else if (responseData?.code) {
        errorCode = responseData.code;
      } else if (responseData?.reason) {
        errorCode = responseData.reason;
      }
    } catch (parseError) {
      // If we can't parse JSON, fall back to status text
      responseMessage = error.statusText;
    }

    errorDetails = {
      errorType: 'HTTP_RESPONSE',
      errorCode,
      statusCode: error.status,
      message: `HTTP response error: ${error.status} ${responseMessage}`,
      context: {
        path,
        method,
        statusCode: error.status,
        statusText: error.statusText,
        url: error.url || 'unknown',
        responseData,
      },
    };
  } else if (error instanceof Error) {
    errorDetails = {
      errorType: 'GENERIC_ERROR',
      message: error.message,
      context: {
        path,
        method,
        name: error.name,
        stack: error.stack,
      },
    };
  } else {
    errorDetails = {
      errorType: 'UNKNOWN_ERROR',
      message: String(error),
      context: { path, method },
    };
  }

  // Log with structured data
  logger.error(errorDetails.message, {
    errorType: errorDetails.errorType,
    errorCode: errorDetails.errorCode,
    statusCode: errorDetails.statusCode,
    path,
    method,
    duration: `${duration}ms`,
    userAgent,
    ip,
    ...errorDetails.context,
  });

  return errorDetails;
}

export function logApiSuccess(
  logger: ReturnType<typeof createRequestLogger>,
  context: ErrorLogContext & { responseSize?: number }
) {
  const { path, method, duration, userAgent, ip, responseSize } = context;

  logger.info(`API request successful: ${method} ${path}`, {
    status: 'SUCCESS',
    path,
    method,
    duration: `${duration}ms`,
    responseSize: responseSize ? `${responseSize} bytes` : undefined,
    userAgent,
    ip,
  });
}
