/**
 * Client-side Loki utilities
 *
 * This file contains browser-safe utilities for working with Loki data
 * on the client side. These functions can be safely imported in React components.
 */
import type { ActivityLogEntry } from './types';

/**
 * Formats a timestamp for display in the UI
 */
export function formatTimestamp(timestamp: string): string {
  return new Date(timestamp).toLocaleString();
}

/**
 * Gets the appropriate CSS class for a log level
 */
export function getLogLevelClass(level: string): string {
  switch (level.toLowerCase()) {
    case 'error':
      return 'text-red-600';
    case 'warn':
    case 'warning':
      return 'text-yellow-600';
    case 'info':
      return 'text-blue-600';
    case 'debug':
      return 'text-gray-600';
    default:
      return 'text-gray-800';
  }
}

/**
 * Gets the appropriate icon for a log level
 */
export function getLogLevelIcon(level: string): string {
  switch (level.toLowerCase()) {
    case 'error':
      return '❌';
    case 'warn':
    case 'warning':
      return '⚠️';
    case 'info':
      return 'ℹ️';
    case 'debug':
      return '🔍';
    default:
      return '📝';
  }
}

/**
 * Filters activity logs based on search criteria
 */
export function filterActivityLogs(
  logs: ActivityLogEntry[],
  searchTerm: string
): ActivityLogEntry[] {
  if (!searchTerm.trim()) {
    return logs;
  }

  const term = searchTerm.toLowerCase();
  return logs.filter((log) => {
    const searchableText = [
      log.user?.username || '',
      log.verb || '',
      log.resource?.resource || '',
      log.resource?.name || '',
      log.resource?.apiGroup || '',
      log.message || '',
      log.responseStatus?.code?.toString() || '',
      log.responseStatus?.reason || '',
      log.requestUri || '',
      log.userAgent || '',
    ]
      .join(' ')
      .toLowerCase();

    return searchableText.includes(term);
  });
}

/**
 * Sorts activity logs by timestamp
 */
export function sortActivityLogs(
  logs: ActivityLogEntry[],
  direction: 'asc' | 'desc' = 'desc'
): ActivityLogEntry[] {
  return [...logs].sort((a, b) => {
    const timeA = new Date(a.timestamp).getTime();
    const timeB = new Date(b.timestamp).getTime();
    return direction === 'desc' ? timeB - timeA : timeA - timeB;
  });
}

/**
 * Groups activity logs by date
 */
export function groupActivityLogsByDate(
  logs: ActivityLogEntry[]
): Record<string, ActivityLogEntry[]> {
  return logs.reduce(
    (groups, log) => {
      const date = new Date(log.timestamp).toDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(log);
      return groups;
    },
    {} as Record<string, ActivityLogEntry[]>
  );
}
