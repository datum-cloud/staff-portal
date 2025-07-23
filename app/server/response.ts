import { AppError } from '@/utils/errors';
import { AxiosError } from 'axios';

export interface ApiResponse {
  requestId: string;
  code: string;
  error?: string;
  data?: any;
  path: string;
}

export function createSuccessResponse(requestId: string, data: any, path: string): ApiResponse {
  return {
    requestId,
    code: 'API_REQUEST_SUCCESS',
    data,
    path,
  };
}

export async function createErrorResponse(
  requestId: string,
  error: unknown,
  path: string
): Promise<{ response: ApiResponse; status: number }> {
  // Handle AppError instances (all custom errors extend AppError)
  if (error instanceof AppError) {
    const appError = error as AppError;
    return {
      response: {
        requestId,
        code: appError.code || 'APP_ERROR',
        error: appError.message,
        path,
      },
      status: appError.statusCode || 500,
    };
  }

  // Handle AxiosError instances
  if (error instanceof AxiosError) {
    return {
      response: {
        requestId,
        code: 'API_REQUEST_FAILED',
        error: error.response?.data?.message || error.message,
        path,
      },
      status: error.response?.status || 500,
    };
  }

  // Handle Response instances
  if (error instanceof Response) {
    // Try to extract error message from response body
    let errorMessage = error.statusText;
    let responseRequestId = requestId; // Default to the passed requestId

    try {
      const clonedResponse = error.clone();
      const responseData = await clonedResponse.json();

      // Extract request ID from response if available
      if (responseData?.requestId) {
        responseRequestId = responseData.requestId;
      }

      // Handle different error response formats
      if (responseData?.message) {
        errorMessage = responseData.message;
      } else if (responseData?.error) {
        errorMessage = responseData.error;
      } else if (responseData?.reason) {
        errorMessage = responseData.reason;
      } else if (responseData?.error_description) {
        errorMessage = responseData.error_description;
      } else if (responseData?.details?.message) {
        errorMessage = responseData.details.message;
      } else if (typeof responseData === 'string') {
        errorMessage = responseData;
      }
    } catch (parseError) {
      // If we can't parse JSON, fall back to status text
      errorMessage = error.statusText;
    }

    return {
      response: {
        requestId: responseRequestId,
        code: error.statusText || 'HTTP_ERROR',
        error: errorMessage,
        path,
      },
      status: error.status || 500,
    };
  }

  // Handle string errors
  if (typeof error === 'string') {
    return {
      response: {
        requestId,
        code: 'GENERIC_ERROR',
        error: error,
        path,
      },
      status: 500,
    };
  }

  // Handle generic errors
  if (error instanceof Error) {
    return {
      response: {
        requestId,
        code: 'GENERIC_ERROR',
        error: error.message,
        path,
      },
      status: 500,
    };
  }

  // Default unknown error
  return {
    response: {
      requestId,
      code: 'UNKNOWN_ERROR',
      error: 'Unknown error occurred',
      path,
    },
    status: 500,
  };
}
