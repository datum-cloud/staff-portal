import { cn } from '@/modules/shadcn/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import * as React from 'react';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      type: {
        primary: '',
        secondary: '',
        tertiary: '',
        warning: '',
        danger: '',
        success: '',
      },
      theme: {
        solid: '',
        light: '',
        outline: 'border',
        borderless: 'border-0 bg-transparent',
      },
      size: {
        small: 'h-8 px-3 text-xs',
        default: 'h-9 px-4 py-2',
        large: 'h-11 px-8 text-base',
        icon: 'h-9 w-9',
      },
      block: {
        true: 'w-full',
        false: '',
      },
    },
    compoundVariants: [
      // Primary button variants
      {
        type: 'primary',
        theme: 'solid',
        className: 'bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/80',
      },
      {
        type: 'primary',
        theme: 'light',
        className:
          'bg-gray-200 text-primary hover:bg-gray-300 active:bg-gray-400 dark:bg-gray-700 dark:hover:bg-gray-600 dark:active:bg-gray-500',
      },
      {
        type: 'primary',
        theme: 'outline',
        className:
          'border-primary text-primary hover:bg-primary hover:text-primary-foreground active:bg-primary/90 active:text-primary-foreground',
      },
      {
        type: 'primary',
        theme: 'borderless',
        className:
          'text-primary hover:bg-gray-200 active:bg-gray-300 dark:hover:bg-gray-700 dark:active:bg-gray-600',
      },

      // Secondary button variants
      {
        type: 'secondary',
        theme: 'solid',
        className:
          'bg-secondary text-secondary-foreground hover:bg-secondary/90 active:bg-secondary/80',
      },
      {
        type: 'secondary',
        theme: 'light',
        className:
          'bg-gray-200 text-secondary hover:bg-gray-300 active:bg-gray-400 dark:bg-gray-700 dark:hover:bg-gray-600 dark:active:bg-gray-500',
      },
      {
        type: 'secondary',
        theme: 'outline',
        className:
          'border-secondary text-secondary hover:bg-secondary hover:text-secondary-foreground active:bg-secondary/90 active:text-secondary-foreground',
      },
      {
        type: 'secondary',
        theme: 'borderless',
        className:
          'text-secondary hover:bg-gray-200 active:bg-gray-300 dark:hover:bg-gray-700 dark:active:bg-gray-600',
      },

      // Tertiary button variants
      {
        type: 'tertiary',
        theme: 'solid',
        className:
          'bg-gray-600 text-white hover:bg-gray-700 active:bg-gray-800 dark:bg-gray-500 dark:text-white dark:hover:bg-gray-400 dark:active:bg-gray-300',
      },
      {
        type: 'tertiary',
        theme: 'light',
        className:
          'bg-gray-200 text-gray-600 hover:bg-gray-300 active:bg-gray-400 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 dark:active:bg-gray-500',
      },
      {
        type: 'tertiary',
        theme: 'outline',
        className:
          'border-gray-600 text-gray-600 hover:bg-gray-600 hover:text-white active:bg-gray-700 active:text-white dark:border-gray-500 dark:text-gray-500 dark:hover:bg-gray-500 dark:hover:text-white dark:active:bg-gray-400 dark:active:text-white',
      },
      {
        type: 'tertiary',
        theme: 'borderless',
        className:
          'text-gray-600 hover:bg-gray-200 active:bg-gray-300 dark:text-gray-400 dark:hover:bg-gray-700 dark:active:bg-gray-600',
      },

      // Warning button variants
      {
        type: 'warning',
        theme: 'solid',
        className:
          'bg-yellow-600 text-white hover:bg-yellow-700 active:bg-yellow-800 dark:bg-yellow-500 dark:hover:bg-yellow-600 dark:active:bg-yellow-700',
      },
      {
        type: 'warning',
        theme: 'light',
        className:
          'bg-gray-200 text-yellow-600 hover:bg-gray-300 active:bg-gray-400 dark:bg-gray-700 dark:text-yellow-400 dark:hover:bg-gray-600 dark:active:bg-gray-500',
      },
      {
        type: 'warning',
        theme: 'outline',
        className:
          'border-yellow-600 text-yellow-600 hover:bg-yellow-600 hover:text-white active:bg-yellow-700 active:text-white dark:border-yellow-500 dark:text-yellow-500 dark:hover:bg-yellow-500 dark:hover:text-white dark:active:bg-yellow-600 dark:active:text-white',
      },
      {
        type: 'warning',
        theme: 'borderless',
        className:
          'text-yellow-600 hover:bg-gray-200 active:bg-gray-300 dark:text-yellow-400 dark:hover:bg-gray-700 dark:active:bg-gray-600',
      },

      // Danger button variants
      {
        type: 'danger',
        theme: 'solid',
        className:
          'bg-destructive text-white hover:bg-red-700 active:bg-red-800 dark:hover:bg-red-600 dark:active:bg-red-700',
      },
      {
        type: 'danger',
        theme: 'light',
        className:
          'bg-gray-200 text-destructive hover:bg-gray-300 active:bg-gray-400 dark:bg-gray-700 dark:hover:bg-gray-600 dark:active:bg-gray-500',
      },
      {
        type: 'danger',
        theme: 'outline',
        className:
          'border-destructive text-destructive hover:bg-destructive hover:text-white active:bg-red-700 active:text-white dark:hover:bg-red-600 dark:hover:text-white dark:active:bg-red-700 dark:active:text-white',
      },
      {
        type: 'danger',
        theme: 'borderless',
        className:
          'text-destructive hover:bg-gray-200 active:bg-gray-300 dark:hover:bg-gray-700 dark:active:bg-gray-600',
      },

      // Success button variants
      {
        type: 'success',
        theme: 'solid',
        className:
          'bg-green-600 text-white hover:bg-green-700 active:bg-green-800 dark:bg-green-500 dark:hover:bg-green-600 dark:active:bg-green-700',
      },
      {
        type: 'success',
        theme: 'light',
        className:
          'bg-gray-200 text-green-600 hover:bg-gray-300 active:bg-gray-400 dark:bg-gray-700 dark:text-green-400 dark:hover:bg-gray-600 dark:active:bg-gray-500',
      },
      {
        type: 'success',
        theme: 'outline',
        className:
          'border-green-600 text-green-600 hover:bg-green-600 hover:text-white active:bg-green-700 active:text-white dark:border-green-500 dark:text-green-500 dark:hover:bg-green-500 dark:hover:text-white dark:active:bg-green-600 dark:active:text-white',
      },
      {
        type: 'success',
        theme: 'borderless',
        className:
          'text-green-600 hover:bg-gray-200 active:bg-gray-300 dark:text-green-400 dark:hover:bg-gray-700 dark:active:bg-gray-600',
      },
    ],
    defaultVariants: {
      type: 'primary',
      theme: 'solid',
      size: 'default',
      block: false,
    },
  }
);

export interface ButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'type'>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  loadingIcon?: React.ReactNode;
  htmlType?: 'button' | 'submit' | 'reset';
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      type,
      theme,
      size,
      block,
      loading = false,
      disabled,
      icon,
      iconPosition = 'left',
      loadingIcon,
      htmlType = 'button',
      children,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    // Auto-detect icon-only buttons and adjust to square
    const isIconOnly = (icon || loading) && !children;

    // For icon-only buttons, replace icon with loading spinner when loading
    const showIcon = !loading && icon;
    const getLoadingIcon = () => {
      const iconSize = size === 'small' ? 'h-3 w-3' : size === 'large' ? 'h-5 w-5' : 'h-4 w-4';
      return loadingIcon || <Loader2 className={`${iconSize} animate-spin`} />;
    };
    const showLoadingIcon =
      loading && (isIconOnly ? getLoadingIcon() : <Loader2 className="h-4 w-4 animate-spin" />);

    const getIconOnlyClass = () => {
      if (!isIconOnly || size === 'icon') return '';
      if (size === 'small') return 'w-8 px-0';
      if (size === 'large') return 'w-11 px-0';
      return 'w-9 px-0'; // default
    };

    return (
      <button
        className={cn(buttonVariants({ type, theme, size, block }), getIconOnlyClass(), className)}
        ref={ref}
        disabled={isDisabled}
        type={htmlType}
        {...props}>
        {/* For icon-only buttons: show loading OR icon, not both */}
        {isIconOnly ? (
          loading ? (
            showLoadingIcon
          ) : (
            showIcon && icon
          )
        ) : (
          <>
            {showLoadingIcon && showLoadingIcon}
            {showIcon && iconPosition === 'left' && icon}
            {children}
            {showIcon && iconPosition === 'right' && icon}
          </>
        )}
      </button>
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
