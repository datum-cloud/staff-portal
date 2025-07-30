import { useEnhancedBreadcrumbs } from './breadcrumb-provider';
import {
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
  Breadcrumb as BreadcrumbUI,
} from '@/modules/shadcn/ui/breadcrumb';
import { ChevronRight } from 'lucide-react';
import React from 'react';
import { Link } from 'react-router';

export interface BreadcrumbItem {
  /** The display text for the breadcrumb */
  label: React.ReactNode;
  /** The path to navigate to (optional - if not provided, item is not clickable) */
  path?: string;
  /** Custom link component (overrides path if provided) */
  link?: React.ReactNode;
  /** Whether this item is clickable (defaults to true if path is provided) */
  clickable?: boolean;
  /** Custom className for this breadcrumb item */
  className?: string;
  /** Additional data for the breadcrumb item */
  data?: any;
}

export interface BreadcrumbConfig {
  /** Custom breadcrumb items (overrides auto-generated from matches) */
  items?: BreadcrumbItem[];
  /** Whether to show separators between items */
  showSeparators?: boolean;
  /** Custom separator component */
  separator?: React.ReactNode;
  /** Whether to auto-generate breadcrumbs from route matches */
  autoGenerate?: boolean;
  /** Custom className for the breadcrumb container */
  className?: string;
  /** Custom className for the breadcrumb list */
  listClassName?: string;
}

export interface BreadcrumbProps extends BreadcrumbConfig {
  /** Custom breadcrumb items (shorthand for config.items) */
  items?: BreadcrumbItem[];
}

/**
 * Enhanced flexible breadcrumb component that supports:
 * - Auto-generation from route matches
 * - Custom breadcrumb items
 * - Centralized custom breadcrumb configurations
 * - Clickable/non-clickable items
 * - Custom links
 * - Custom separators
 * - Custom styling
 */
export function Breadcrumb({
  items: customItems,
  showSeparators = true,
  separator = <ChevronRight />,
  autoGenerate = true,
  className,
  listClassName,
}: BreadcrumbProps) {
  // Always call the hook, but only use it if needed
  const enhancedItems = useEnhancedBreadcrumbs();

  // Use custom items if provided, otherwise use enhanced breadcrumb system
  const items = customItems || (autoGenerate ? enhancedItems : []);

  if (items.length === 0) {
    return null;
  }

  return (
    <BreadcrumbUI className={className}>
      <BreadcrumbList className={listClassName}>
        {items.map((item, idx) => (
          <React.Fragment key={idx}>
            {idx !== 0 && showSeparators && (
              <BreadcrumbSeparator className="hidden md:block">{separator}</BreadcrumbSeparator>
            )}
            <BreadcrumbItem className={item.className}>
              {renderBreadcrumbItem(item, idx === items.length - 1)}
            </BreadcrumbItem>
          </React.Fragment>
        ))}
      </BreadcrumbList>
    </BreadcrumbUI>
  );
}

/**
 * Render a single breadcrumb item
 */
function renderBreadcrumbItem(item: BreadcrumbItem, isLast: boolean): React.ReactNode {
  // If custom link is provided, use it
  if (item.link) {
    return item.link;
  }

  // If it's the last item or not clickable, render as page
  if (isLast || !item.clickable || !item.path) {
    return <BreadcrumbPage>{item.label}</BreadcrumbPage>;
  }

  // Otherwise render as clickable link
  return (
    <BreadcrumbLink asChild>
      <Link to={item.path}>{item.label}</Link>
    </BreadcrumbLink>
  );
}

/**
 * Utility function to create breadcrumb items
 */
export function createBreadcrumbItem(
  label: React.ReactNode,
  options: Partial<BreadcrumbItem> = {}
): BreadcrumbItem {
  return {
    label,
    ...options,
  };
}

/**
 * Utility function to create a non-clickable breadcrumb item
 */
export function createStaticBreadcrumbItem(
  label: React.ReactNode,
  options: Partial<BreadcrumbItem> = {}
): BreadcrumbItem {
  return createBreadcrumbItem(label, {
    clickable: false,
    ...options,
  });
}

/**
 * Utility function to create a clickable breadcrumb item with custom path
 */
export function createClickableBreadcrumbItem(
  label: React.ReactNode,
  path: string,
  options: Partial<BreadcrumbItem> = {}
): BreadcrumbItem {
  return createBreadcrumbItem(label, {
    path,
    clickable: true,
    ...options,
  });
}

export default Breadcrumb;
