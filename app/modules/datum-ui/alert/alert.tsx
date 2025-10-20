import { cn } from '@/modules/shadcn/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';
import { AlertTriangle, CheckCircle, Info, XCircle } from 'lucide-react';
import * as React from 'react';

const alertVariants = cva('relative w-full rounded-lg border', {
  variants: {
    variant: {
      default: 'bg-background text-foreground',
      destructive: 'border-destructive/50 text-destructive dark:border-destructive',
      warning: 'border-yellow-500/50 text-yellow-600 dark:border-yellow-800 dark:text-yellow-400',
      success: 'border-green-500/50 text-green-600 dark:border-green-800 dark:text-green-400',
      info: 'border-blue-500/50 text-blue-600 dark:border-blue-800 dark:text-blue-400',
    },
    size: {
      default: 'p-3',
      sm: 'p-2',
      lg: 'p-4',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'default',
  },
});

export interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {
  title?: string;
  description?: string;
  showIcon?: boolean;
  icon?: React.ReactNode;
}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  (
    {
      className,
      variant = 'default',
      size = 'default',
      title,
      description,
      showIcon = true,
      icon,
      children,
      ...props
    },
    ref
  ) => {
    const renderIcon = () => {
      if (!showIcon) return null;

      if (icon) {
        return <div className="flex-shrink-0">{icon}</div>;
      }

      switch (variant) {
        case 'warning':
          return (
            <div className="flex-shrink-0">
              <AlertTriangle className="h-4 w-4" />
            </div>
          );
        case 'success':
          return (
            <div className="flex-shrink-0">
              <CheckCircle className="h-4 w-4" />
            </div>
          );
        case 'destructive':
          return (
            <div className="flex-shrink-0">
              <XCircle className="h-4 w-4" />
            </div>
          );
        case 'info':
          return (
            <div className="flex-shrink-0">
              <Info className="h-4 w-4" />
            </div>
          );
        default:
          return (
            <div className="flex-shrink-0">
              <Info className="h-4 w-4" />
            </div>
          );
      }
    };

    return (
      <div
        ref={ref}
        role="alert"
        className={cn(alertVariants({ variant, size }), className)}
        {...props}>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            {renderIcon()}
            {title && <h5 className="leading-none font-medium tracking-tight">{title}</h5>}
          </div>
          {description && <div className="text-sm leading-relaxed">{description}</div>}
          {children}
        </div>
      </div>
    );
  }
);

Alert.displayName = 'Alert';

export { Alert, alertVariants };
