import { STATUS_ICONS } from '@/utils/config/icons.config';
import { Button } from '@datum-cloud/datum-ui/button';
import type { ComponentProps, ReactNode } from 'react';

interface ButtonLoadingProps extends ComponentProps<typeof Button> {
  children: ReactNode;
  loading?: boolean;
}

export default function ButtonLoading({ children, loading = false, ...props }: ButtonLoadingProps) {
  return (
    <Button {...props} disabled={loading || props.disabled}>
      {loading && <STATUS_ICONS.loading className="mr-2 h-4 w-4 animate-spin" />}
      {children}
    </Button>
  );
}
