import { toBoolean } from '@/utils/helpers';

/**
 * Shared logger utility for consistent JSON logging across the application
 * Optimized for Bun runtime
 */
export interface LogContext {
  reqId?: string;
  userId?: string;
  sessionId?: string;
  [key: string]: any;
}

export interface LogLevel {
  level: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';
}

export class Logger {
  private context: LogContext = {};

  constructor(initialContext: LogContext = {}) {
    this.context = { ...initialContext };
  }

  /**
   * Create a child logger with additional context
   */
  child(context: LogContext): Logger {
    const child = new Logger();
    child.context = { ...this.context, ...context };
    return child;
  }

  /**
   * Add context to the current logger
   */
  addContext(context: LogContext): this {
    this.context = { ...this.context, ...context };
    return this;
  }

  /**
   * Log a message with the specified level
   * Optimized for Bun's performance
   */
  private log(level: LogLevel['level'], message: string, data?: any): void {
    const logEntry = {
      level,
      time: Date.now(),
      msg: message,
      ...this.context,
      ...(data && { data }),
    };

    // Use Bun's optimized console.log for better performance
    // Pretty print in development mode for better readability
    const isDev = typeof window === 'undefined' ? process.env.DEBUG : window?.DEBUG;

    if (toBoolean(isDev)) {
      console.log(JSON.stringify(logEntry, null, 2));
    } else {
      console.log(JSON.stringify(logEntry));
    }
  }

  trace(message: string, data?: any): void {
    this.log('trace', message, data);
  }

  debug(message: string, data?: any): void {
    this.log('debug', message, data);
  }

  info(message: string, data?: any): void {
    this.log('info', message, data);
  }

  warn(message: string, data?: any): void {
    this.log('warn', message, data);
  }

  error(message: string, data?: any): void {
    this.log('error', message, data);
  }

  fatal(message: string, data?: any): void {
    this.log('fatal', message, data);
  }

  /**
   * Log HTTP request details
   */
  httpRequest(reqId: string, method: string, url: string, headers?: Record<string, string>): void {
    this.log('info', 'HTTP Request', {
      reqId,
      method,
      url,
      headers,
    });
  }

  /**
   * Log HTTP response details
   */
  httpResponse(
    reqId: string,
    status: number,
    responseTime: number,
    headers?: Record<string, string>
  ): void {
    this.log('info', 'HTTP Response', {
      reqId,
      status,
      responseTime,
      headers,
    });
  }

  /**
   * Log authentication events
   */
  auth(userId: string, action: string, details?: any): void {
    this.log('info', 'Authentication', {
      userId,
      action,
      ...details,
    });
  }

  /**
   * Log business logic events
   */
  business(action: string, details?: any): void {
    this.log('info', 'Business Logic', {
      action,
      ...details,
    });
  }
}

// Create a default logger instance
export const logger = new Logger();

// Export convenience functions
export const log = {
  trace: (message: string, data?: any) => logger.trace(message, data),
  debug: (message: string, data?: any) => logger.debug(message, data),
  info: (message: string, data?: any) => logger.info(message, data),
  warn: (message: string, data?: any) => logger.warn(message, data),
  error: (message: string, data?: any) => logger.error(message, data),
  fatal: (message: string, data?: any) => logger.fatal(message, data),
};

/**
 * Create a logger with request context for use in route handlers
 * Usage: const reqLogger = createRequestLogger(c);
 */
export function createRequestLogger(context: { get: (key: string) => string | undefined }) {
  const reqId = context.get('requestId');
  return logger.child({ reqId });
}

export default logger;
