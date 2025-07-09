import { cn } from '@/modules/shadcn/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

// Title component variants
const titleVariants = cva('font-semibold leading-tight tracking-tight', {
  variants: {
    level: {
      1: 'text-2xl md:text-3xl lg:text-4xl',
      2: 'text-xl md:text-2xl lg:text-3xl',
      3: 'text-lg md:text-xl lg:text-2xl',
      4: 'text-base md:text-lg lg:text-xl',
      5: 'text-sm md:text-base lg:text-lg',
      6: 'text-xs md:text-sm lg:text-base',
    },
    weight: {
      normal: 'font-normal',
      medium: 'font-medium',
      semibold: 'font-semibold',
      bold: 'font-bold',
      extrabold: 'font-extrabold',
    },
  },
  defaultVariants: {
    level: 4,
    weight: 'semibold',
  },
});

// Text component variants
const textVariants = cva('leading-relaxed', {
  variants: {
    size: {
      xs: 'text-xs',
      sm: 'text-sm',
      base: 'text-base',
      lg: 'text-lg',
      xl: 'text-xl',
      '2xl': 'text-2xl',
      '3xl': 'text-3xl',
      '4xl': 'text-4xl',
    },
    weight: {
      normal: 'font-normal',
      medium: 'font-medium',
      semibold: 'font-semibold',
      bold: 'font-bold',
      extrabold: 'font-extrabold',
    },
    textColor: {
      default: 'text-foreground',
      muted: 'text-muted-foreground',
      primary: 'text-primary',
      secondary: 'text-secondary-foreground',
      destructive: 'text-destructive',
      success: 'text-green-600 dark:text-green-400',
      warning: 'text-yellow-600 dark:text-yellow-400',
      info: 'text-blue-600 dark:text-blue-400',
    },
    type: {
      default: '',
      code: 'font-mono bg-muted px-1.5 py-0.5 rounded text-sm',
      mark: 'bg-yellow-100 dark:bg-yellow-900/30 px-1.5 py-0.5 rounded',
      underline: 'underline underline-offset-4',
      delete: 'line-through',
      strong: 'font-semibold',
      italic: 'italic',
    },
  },
  defaultVariants: {
    size: 'base',
    weight: 'normal',
    textColor: 'default',
    type: 'default',
  },
});

// Paragraph component variants
const paragraphVariants = cva('leading-relaxed', {
  variants: {
    size: {
      xs: 'text-xs',
      sm: 'text-sm',
      base: 'text-base',
      lg: 'text-lg',
      xl: 'text-xl',
    },
    spacing: {
      tight: 'leading-tight',
      normal: 'leading-relaxed',
      loose: 'leading-loose',
    },
  },
  defaultVariants: {
    size: 'base',
    spacing: 'normal',
  },
});

// Title component
interface TitleProps
  extends React.HTMLAttributes<HTMLHeadingElement>,
    VariantProps<typeof titleVariants> {
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
}

const Title = React.forwardRef<HTMLHeadingElement, TitleProps>(
  ({ className, level, weight, as, children, ...props }, ref) => {
    const Component = as || (`h${level || 1}` as keyof React.JSX.IntrinsicElements);

    return React.createElement(
      Component,
      {
        ref,
        className: cn(titleVariants({ level, weight, className })),
        ...props,
      },
      children
    );
  }
);
Title.displayName = 'Title';

// Text component
interface TextProps
  extends Omit<React.HTMLAttributes<HTMLSpanElement>, 'color'>,
    VariantProps<typeof textVariants> {
  as?: 'span' | 'p' | 'div';
  copyable?: boolean;
  ellipsis?: boolean;
  mark?: boolean;
  underline?: boolean;
  delete?: boolean;
  strong?: boolean;
  italic?: boolean;
  code?: boolean;
}

const Text = React.forwardRef<HTMLSpanElement, TextProps>(
  (
    {
      className,
      size,
      weight,
      textColor,
      type,
      as = 'span',
      copyable,
      ellipsis,
      mark,
      underline,
      delete: deleteProp,
      strong,
      italic,
      code,
      children,
      ...props
    },
    ref
  ) => {
    // Determine the type based on props
    let finalType = type;
    if (mark) finalType = 'mark';
    if (underline) finalType = 'underline';
    if (deleteProp) finalType = 'delete';
    if (strong) finalType = 'strong';
    if (italic) finalType = 'italic';
    if (code) finalType = 'code';

    const content = (
      <>
        {children}
        {copyable && (
          <button
            className="hover:bg-accent hover:text-accent-foreground ml-2 inline-flex h-4 w-4 items-center justify-center rounded-md text-sm font-medium transition-colors"
            onClick={() => {
              if (typeof children === 'string') {
                navigator.clipboard.writeText(children);
              }
            }}
            title="Copy text">
            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
          </button>
        )}
      </>
    );

    if (as === 'span') {
      return (
        <span
          ref={ref}
          className={cn(
            textVariants({ size, weight, textColor, type: finalType }),
            ellipsis && 'truncate',
            className
          )}
          {...props}>
          {content}
        </span>
      );
    }

    if (as === 'p') {
      return (
        <p
          ref={ref as React.Ref<HTMLParagraphElement>}
          className={cn(
            textVariants({ size, weight, textColor, type: finalType }),
            ellipsis && 'truncate',
            className
          )}
          {...props}>
          {content}
        </p>
      );
    }

    return (
      <div
        ref={ref as React.Ref<HTMLDivElement>}
        className={cn(
          textVariants({ size, weight, textColor, type: finalType }),
          ellipsis && 'truncate',
          className
        )}
        {...props}>
        {content}
      </div>
    );
  }
);
Text.displayName = 'Text';

// Paragraph component
interface ParagraphProps
  extends React.HTMLAttributes<HTMLParagraphElement>,
    VariantProps<typeof paragraphVariants> {
  as?: 'p' | 'div';
}

const Paragraph = React.forwardRef<HTMLParagraphElement, ParagraphProps>(
  ({ className, size, spacing, as = 'p', children, ...props }, ref) => {
    if (as === 'div') {
      return (
        <div
          ref={ref as React.Ref<HTMLDivElement>}
          className={cn(paragraphVariants({ size, spacing, className }))}
          {...props}>
          {children}
        </div>
      );
    }

    return (
      <p ref={ref} className={cn(paragraphVariants({ size, spacing, className }))} {...props}>
        {children}
      </p>
    );
  }
);
Paragraph.displayName = 'Paragraph';

// Link component
interface LinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  target?: '_blank' | '_self' | '_parent' | '_top';
  rel?: string;
}

const Link = React.forwardRef<HTMLAnchorElement, LinkProps>(
  ({ className, children, href, target = '_self', rel, ...props }, ref) => {
    const defaultRel = target === '_blank' ? 'noopener noreferrer' : undefined;

    return (
      <a
        ref={ref}
        href={href}
        target={target}
        rel={rel || defaultRel}
        className={cn(
          'text-primary focus-visible:ring-ring underline-offset-4 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
          className
        )}
        {...props}>
        {children}
      </a>
    );
  }
);
Link.displayName = 'Link';

// List components
interface ListProps extends Omit<React.OlHTMLAttributes<HTMLOListElement>, 'type'> {
  as?: 'ol' | 'ul';
  listType?: 'ordered' | 'unordered';
}

const List = React.forwardRef<HTMLOListElement, ListProps>(
  ({ className, as, listType = 'unordered', children, ...props }, ref) => {
    const Component = as || (listType === 'ordered' ? 'ol' : 'ul');

    return React.createElement(
      Component,
      {
        ref,
        className: cn(
          'space-y-2',
          listType === 'ordered' ? 'list-decimal list-inside' : 'list-disc list-inside',
          className
        ),
        ...props,
      },
      children
    );
  }
);
List.displayName = 'List';

interface ListItemProps extends React.LiHTMLAttributes<HTMLLIElement> {}

const ListItem = React.forwardRef<HTMLLIElement, ListItemProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <li ref={ref} className={cn('leading-relaxed', className)} {...props}>
        {children}
      </li>
    );
  }
);
ListItem.displayName = 'ListItem';

// Blockquote component
interface BlockquoteProps extends React.BlockquoteHTMLAttributes<HTMLQuoteElement> {}

const Blockquote = React.forwardRef<HTMLQuoteElement, BlockquoteProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <blockquote
        ref={ref}
        className={cn('border-primary text-muted-foreground border-l-4 pl-4 italic', className)}
        {...props}>
        {children}
      </blockquote>
    );
  }
);
Blockquote.displayName = 'Blockquote';

// Code component
interface CodeProps extends React.HTMLAttributes<HTMLElement> {
  as?: 'code' | 'pre';
}

const Code = React.forwardRef<HTMLElement, CodeProps>(
  ({ className, as = 'code', children, ...props }, ref) => {
    if (as === 'pre') {
      return (
        <pre
          ref={ref as React.Ref<HTMLPreElement>}
          className={cn(
            'bg-muted relative overflow-x-auto rounded p-4 font-mono text-sm',
            className
          )}
          {...props}>
          {children}
        </pre>
      );
    }

    return (
      <code
        ref={ref as React.Ref<HTMLElement>}
        className={cn(
          'bg-muted relative rounded px-[0.3rem] py-[0.2rem] font-mono text-sm',
          className
        )}
        {...props}>
        {children}
      </code>
    );
  }
);
Code.displayName = 'Code';

export {
  Title,
  Text,
  Paragraph,
  Link,
  List,
  ListItem,
  Blockquote,
  Code,
  titleVariants,
  textVariants,
  paragraphVariants,
};
