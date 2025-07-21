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

export interface CallerInfo {
  file?: string;
  fullPath?: string;
  line?: number;
  column?: number;
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
    // Capture caller information
    const stack = new Error().stack;
    const callerInfo = this.getCallerInfo(stack);

    const logEntry = {
      level,
      time: Date.now(),
      msg: message,
      ...this.context,
      ...(data && { data }),
      ...(callerInfo && { caller: callerInfo }),
    };

    // Use Bun's optimized console.log for better performance
    // Pretty print in development mode for better readability
    const isDebug = typeof window === 'undefined' ? process.env.DEBUG : window?.ENV?.DEBUG;

    if (toBoolean(isDebug)) {
      // In debug mode, create clickable file links for browser console
      if (typeof window !== 'undefined' && callerInfo) {
        // Use separate console.log calls for better browser compatibility
        console.log(
          `%c${level.toUpperCase()}: ${message}`,
          `color: ${this.getLevelColor(level)}; font-weight: bold;`
        );
        console.log(logEntry);

        // Show clickable link - use full path if available, otherwise show descriptive path
        if (callerInfo.fullPath) {
          console.log(
            `%c🔗 Click to open: ${callerInfo.fullPath}:${callerInfo.line}:${callerInfo.column}`,
            'color: #0066cc; font-size: 11px; cursor: pointer;'
          );
        } else {
          console.log(
            `%c📍 ${callerInfo.file}:${callerInfo.line}:${callerInfo.column}`,
            'color: #666; font-size: 12px; text-decoration: underline; cursor: pointer;'
          );
        }
      } else {
        console.log(logEntry);
      }
    } else {
      console.log(JSON.stringify(logEntry));
    }
  }

  /**
   * Get color for log level in browser console
   */
  private getLevelColor(level: LogLevel['level']): string {
    switch (level) {
      case 'trace':
        return '#888';
      case 'debug':
        return '#0066cc';
      case 'info':
        return '#28a745';
      case 'warn':
        return '#ffc107';
      case 'error':
        return '#dc3545';
      case 'fatal':
        return '#721c24';
      default:
        return '#000';
    }
  }

  /**
   * Extract caller information from stack trace
   */
  private getCallerInfo(stack?: string): CallerInfo | null {
    if (!stack) return null;

    const lines = stack.split('\n');

    // Skip the first line (Error message) and find the first line that's not from the logger
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();

      // Skip lines from the logger itself
      if (
        line.includes('Logger.log') ||
        line.includes('logger/index.ts') ||
        line.includes('at Logger.') ||
        line.includes('at log.') ||
        line.includes('Logger.trace') ||
        line.includes('Logger.debug') ||
        line.includes('Logger.info') ||
        line.includes('Logger.warn') ||
        line.includes('Logger.error') ||
        line.includes('Logger.fatal') ||
        line.includes('log.trace') ||
        line.includes('log.debug') ||
        line.includes('log.info') ||
        line.includes('log.warn') ||
        line.includes('log.error') ||
        line.includes('log.fatal') ||
        line.includes('getCallerInfo') ||
        line.includes('Error')
      ) {
        continue;
      }

      // Parse the stack trace line to extract file, line, and column
      const match = line.match(/at\s+(.+?)\s+\((.+?):(\d+):(\d+)\)/);
      if (match) {
        const [, functionName, filePath, line, column] = match;

        // Extract a more descriptive path (last 2-3 segments)
        const pathSegments = filePath.split('/');
        const fileName = pathSegments.pop() || filePath;
        const parentDir = pathSegments.length > 0 ? pathSegments[pathSegments.length - 1] : '';
        const grandParentDir = pathSegments.length > 1 ? pathSegments[pathSegments.length - 2] : '';

        // Create a descriptive path: grandParent/parent/file or parent/file
        let descriptivePath = fileName;
        if (parentDir) {
          descriptivePath = `${parentDir}/${fileName}`;
        }
        if (grandParentDir && grandParentDir !== 'app' && grandParentDir !== 'src') {
          descriptivePath = `${grandParentDir}/${descriptivePath}`;
        }

        return {
          file: descriptivePath,
          fullPath: filePath,
          line: parseInt(line, 10),
          column: parseInt(column, 10),
        };
      }

      // Handle cases where the function name might not be present
      const simpleMatch = line.match(/at\s+(.+?):(\d+):(\d+)/);
      if (simpleMatch) {
        const [, filePath, line, column] = simpleMatch;
        // Extract a more descriptive path (last 2-3 segments)
        const pathSegments = filePath.split('/');
        const fileName = pathSegments.pop() || filePath;
        const parentDir = pathSegments.length > 0 ? pathSegments[pathSegments.length - 1] : '';
        const grandParentDir = pathSegments.length > 1 ? pathSegments[pathSegments.length - 2] : '';

        // Create a descriptive path: grandParent/parent/file or parent/file
        let descriptivePath = fileName;
        if (parentDir) {
          descriptivePath = `${parentDir}/${fileName}`;
        }
        if (grandParentDir && grandParentDir !== 'app' && grandParentDir !== 'src') {
          descriptivePath = `${grandParentDir}/${descriptivePath}`;
        }

        return {
          file: descriptivePath,
          fullPath: filePath,
          line: parseInt(line, 10),
          column: parseInt(column, 10),
        };
      }
    }

    return null;
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
