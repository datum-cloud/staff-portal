import { buttonVariants } from './button';
import { cn } from '@/modules/shadcn/lib/utils';
import type { VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import * as React from 'react';
import { Link } from 'react-router';

export interface ButtonLinkProps
  extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'type'>,
    VariantProps<typeof buttonVariants> {
  /** Internal route path (uses React Router Link) */
  to?: string;
  /** External URL (uses regular anchor tag) */
  href?: string;
  /** Disable the link (prevents navigation and applies disabled styles) */
  disabled?: boolean;
  /** Loading state (shows spinner, prevents navigation) */
  loading?: boolean;
  /** Icon to display */
  icon?: React.ReactNode;
  /** Position of the icon */
  iconPosition?: 'left' | 'right';
  /** Custom loading icon */
  loadingIcon?: React.ReactNode;
}

const ButtonLink = React.forwardRef<HTMLAnchorElement, ButtonLinkProps>(
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
      to,
      href,
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

    const baseClassName = cn(
      buttonVariants({ type, theme, size, block }),
      getIconOnlyClass(),
      'no-underline', // Remove default link underline
      isDisabled && 'pointer-events-none opacity-50',
      className
    );

    const content = (
      <>
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
      </>
    );

    // Use React Router Link for internal routes
    if (to && !isDisabled) {
      // Extract anchor-specific props that Link doesn't accept
      const { href: _href, ...restProps } = props as Record<string, any>;
      const linkProps = restProps as Omit<
        React.ComponentProps<typeof Link>,
        'to' | 'className' | 'ref' | 'children'
      >;
      return (
        <Link to={to} className={baseClassName} ref={ref} data-button-link {...linkProps}>
          {content}
        </Link>
      );
    }

    // Use regular anchor for external links or when disabled
    return (
      <a
        href={isDisabled ? undefined : href || to}
        className={baseClassName}
        ref={ref}
        aria-disabled={isDisabled}
        data-button-link
        {...props}>
        {content}
      </a>
    );
  }
);

ButtonLink.displayName = 'ButtonLink';

export { ButtonLink };
