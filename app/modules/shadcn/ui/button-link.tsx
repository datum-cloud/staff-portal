import { cn } from '@/modules/shadcn/lib/utils';
import { buttonVariants } from '@/modules/shadcn/ui/button';
import { type VariantProps } from 'class-variance-authority';
import { Link, type LinkProps } from 'react-router';

interface ButtonLinkProps extends LinkProps, VariantProps<typeof buttonVariants> {
  className?: string;
}

function ButtonLink({ className, variant, size, to, children, ...props }: ButtonLinkProps) {
  return (
    <Link
      to={to}
      data-button-link="true"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}>
      {children}
    </Link>
  );
}

export { ButtonLink };
