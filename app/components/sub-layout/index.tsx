import { SidebarMenuComponent } from './sidebar-menu';
import { cn } from '@/modules/shadcn/lib/utils';
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
      className={cn('text-sidebar-foreground w-48 flex-shrink-0 border-r', className)}
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
  // Use useMemo to cache the slot detection
  const slots = React.useMemo(() => {
    let leftSidebar: React.ReactElement | null = null;
    let rightSidebar: React.ReactElement | null = null;
    let content: React.ReactElement | null = null;

    React.Children.forEach(children, (child) => {
      if (React.isValidElement(child)) {
        if (child.type === SubLayoutSidebarLeft) {
          leftSidebar = child;
        } else if (child.type === SubLayoutSidebarRight) {
          rightSidebar = child;
        } else if (child.type === SubLayoutContent) {
          content = child;
        }
      }
    });

    return { leftSidebar, rightSidebar, content };
  }, [children]);

  return (
    <div className={cn('flex h-full w-full', className)} {...props}>
      {slots.leftSidebar}
      {slots.content}
      {slots.rightSidebar}
    </div>
  );
});

// Create the compound component with proper typing
const SubLayout = Object.assign(SubLayoutComponent, {
  SidebarLeft: SubLayoutSidebarLeft,
  SidebarRight: SubLayoutSidebarRight,
  Content: SubLayoutContent,
  SidebarMenu: SidebarMenuComponent,
});

export { SubLayout };
