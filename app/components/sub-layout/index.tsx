import { type MenuItem, SidebarMenuComponent } from './sidebar-menu';
import { SidebarMenuTabs } from './sidebar-menu-tabs';
import AppActionBar from '@/components/app-actiobar';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { cn } from '@datum-cloud/datum-ui/utils';
import * as React from 'react';

interface SubLayoutProps extends React.ComponentProps<'div'> {
  children: React.ReactNode;
}

interface SubLayoutSidebarProps extends React.ComponentProps<'div'> {
  children: React.ReactNode;
}

const SubLayoutSidebarLeft = React.memo(function SubLayoutSidebarLeft({
  className,
  children,
  ...props
}: SubLayoutSidebarProps) {
  return (
    <div
      className={cn(
        'text-sidebar-foreground sticky top-14 z-10 h-[calc(100vh-3.5rem)] w-48 flex-shrink-0 border-r ease-linear',
        className
      )}
      {...props}>
      {children}
    </div>
  );
});

const SubLayoutSidebarRight = React.memo(function SubLayoutSidebarRight({
  className,
  children,
  ...props
}: SubLayoutSidebarProps) {
  return (
    <div
      className={cn('text-sidebar-foreground w-48 flex-shrink-0 border-l', className)}
      {...props}>
      {children}
    </div>
  );
});

const SubLayoutContent = React.memo(function SubLayoutContent({
  className,
  children,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div className={cn('min-w-0 flex-1', className)} {...props}>
      {children}
    </div>
  );
});

const SubLayoutComponent = React.memo(function SubLayout({
  className,
  children,
  ...props
}: SubLayoutProps) {
  const breakpoint = useBreakpoint();
  const isCompact = breakpoint !== 'desktop';

  // Use useMemo to cache the slot detection
  const slots = React.useMemo(() => {
    let leftSidebar: React.ReactElement | null = null;
    let rightSidebar: React.ReactElement | null = null;
    let content: React.ReactElement | null = null;
    let actionBar: React.ReactElement | null = null;

    React.Children.forEach(children, (child) => {
      if (React.isValidElement(child)) {
        if (child.type === SubLayoutSidebarLeft) {
          leftSidebar = child;
        } else if (child.type === SubLayoutSidebarRight) {
          rightSidebar = child;
        } else if (child.type === SubLayoutContent) {
          content = child;
        } else if (child.type === AppActionBar) {
          actionBar = child;
        }
      }
    });

    return { leftSidebar, rightSidebar, content, actionBar };
  }, [children]);

  // In compact mode, try to extract menuItems from the SidebarLeft > SidebarMenu
  // subtree so we can render them as a horizontal tab bar instead.
  const tabMenuItems = React.useMemo<MenuItem[] | null>(() => {
    if (!isCompact || !slots.leftSidebar) return null;
    let found: MenuItem[] | null = null;
    const leftChildren = (slots.leftSidebar as React.ReactElement<SubLayoutSidebarProps>).props
      .children;
    React.Children.forEach(leftChildren, (child) => {
      if (React.isValidElement(child) && child.type === SidebarMenuComponent) {
        const props = child.props as { menuItems?: MenuItem[] };
        if (props.menuItems) found = props.menuItems;
      }
    });
    return found;
  }, [isCompact, slots.leftSidebar]);

  const showTabs = isCompact && tabMenuItems !== null;

  return (
    <>
      {slots.actionBar}
      {showTabs && <SidebarMenuTabs menuItems={tabMenuItems!} />}
      <div className={cn('flex h-full w-full', className)} {...props}>
        {!showTabs && slots.leftSidebar}
        {slots.content}
        {slots.rightSidebar}
      </div>
    </>
  );
});

// Create the compound component with proper typing
const SubLayout = Object.assign(SubLayoutComponent, {
  SidebarLeft: SubLayoutSidebarLeft,
  SidebarRight: SubLayoutSidebarRight,
  Content: SubLayoutContent,
  SidebarMenu: SidebarMenuComponent,
  ActionBar: AppActionBar,
});

export { SubLayout };
