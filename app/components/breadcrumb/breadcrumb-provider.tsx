import { type BreadcrumbItem } from './index';
import { useLocation, useMatches } from 'react-router';

/**
 * Options for configuring a breadcrumb item
 */
export interface BreadcrumbOptions {
  /** The display text/label for the breadcrumb */
  label: React.ReactNode;
  /** Whether this item is clickable (defaults to true) */
  clickable?: boolean;
  /** Custom path to navigate to (defaults to route pathname) */
  path?: string;
  /** Custom link component (overrides path if provided) */
  link?: React.ReactNode;
  /** Custom className for this breadcrumb item */
  className?: string;
  /** Additional data for the breadcrumb item */
  data?: any;
}

/**
 * Enhanced route handle interface that supports custom breadcrumbs
 */
export interface EnhancedRouteHandle {
  /** Standard breadcrumb (backward compatible) */
  breadcrumb?:
    | React.ReactNode
    | ((data: any) => React.ReactNode)
    | ((data: any) => BreadcrumbOptions);
  /** Custom breadcrumb configuration */
  customBreadcrumb?: {
    /** Function to generate custom breadcrumb items */
    generateItems: (params: any, data: any) => BreadcrumbItem[];
    /** Whether to replace auto-generated breadcrumbs */
    replace?: boolean;
  };
}

/**
 * Hook to get custom breadcrumbs for the current route
 * Priority: Page-level custom breadcrumbs > Auto-generated
 */
export function useCustomBreadcrumbs(): BreadcrumbItem[] | null {
  const location = useLocation();
  const matches = useMatches();

  // Check for page-level custom breadcrumbs in route handles
  for (const match of matches) {
    const handle = match.handle as EnhancedRouteHandle;

    if (handle?.customBreadcrumb) {
      try {
        // Extract route parameters from the current location
        const params = extractRouteParams(location.pathname, match.pathname);

        // Generate custom breadcrumb items
        const customItems = handle.customBreadcrumb.generateItems(params, match.data);

        if (handle.customBreadcrumb.replace !== false) {
          // Replace auto-generated breadcrumbs completely
          return customItems;
        } else {
          // Insert custom breadcrumbs at the correct position
          return insertCustomBreadcrumbs(matches, match, customItems);
        }
      } catch (error) {
        console.warn('Error generating page-level custom breadcrumbs:', error);
        return null;
      }
    }
  }

  return null;
}

/**
 * Insert custom breadcrumbs at the correct position in the breadcrumb chain
 */
function insertCustomBreadcrumbs(
  matches: any[],
  currentMatch: any,
  customItems: BreadcrumbItem[]
): BreadcrumbItem[] {
  const result: BreadcrumbItem[] = [];

  for (const match of matches) {
    if (match.handle?.breadcrumb) {
      const breadcrumb = match.handle.breadcrumb;
      const label = typeof breadcrumb === 'function' ? breadcrumb(match.data) : breadcrumb;

      // If this is the current match with custom breadcrumbs, use the custom items
      if (match === currentMatch) {
        result.push(...customItems);
      } else {
        // Otherwise use the standard breadcrumb with options support
        const breadcrumbItem = createBreadcrumbItemFromHandle(breadcrumb, match);
        result.push(breadcrumbItem);
      }
    }
  }

  return result;
}

/**
 * Generate auto breadcrumbs from matches
 */
function generateAutoBreadcrumbs(matches: any[]): BreadcrumbItem[] {
  return matches
    .filter((match: any) => Boolean(match.handle?.breadcrumb))
    .map((match: any) => {
      const breadcrumb = match.handle.breadcrumb;
      return createBreadcrumbItemFromHandle(breadcrumb, match);
    });
}

/**
 * Create breadcrumb item from handle, supporting options format
 */
function createBreadcrumbItemFromHandle(breadcrumb: any, match: any): BreadcrumbItem {
  const label = typeof breadcrumb === 'function' ? breadcrumb(match.data) : breadcrumb;

  // Check if the label is an object with options
  if (typeof label === 'object' && label !== null && 'label' in label) {
    return {
      label: label.label,
      path: label.clickable !== false ? match.pathname : undefined,
      clickable: label.clickable !== false,
      className: label.className,
      data: match.data,
      ...label,
    };
  }

  return {
    label,
    path: match.pathname,
    clickable: true,
    data: match.data,
  };
}

/**
 * Extract route parameters from current pathname and route pattern
 */
function extractRouteParams(pathname: string, routePattern: string): Record<string, string> {
  const params: Record<string, string> = {};

  // Convert route pattern to regex
  const regex = new RegExp('^' + routePattern.replace(/:[^\/]+/g, '([^\/]+)') + '$');
  const match = pathname.match(regex);

  if (match) {
    const paramNames = routePattern.match(/:[^\/]+/g)?.map((p) => p.slice(1)) || [];
    paramNames.forEach((name, index) => {
      params[name] = match[index + 1];
    });
  }

  return params;
}

/**
 * Enhanced breadcrumb hook that combines auto-generated and custom breadcrumbs
 */
export function useEnhancedBreadcrumbs(): BreadcrumbItem[] {
  const customItems = useCustomBreadcrumbs();
  const matches = useMatches();

  if (customItems) {
    return customItems;
  }

  // Fall back to auto-generated breadcrumbs
  return generateAutoBreadcrumbs(matches);
}
