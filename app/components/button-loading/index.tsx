import { Button } from '@/modules/shadcn/ui/button';
import { Loader2Icon } from 'lucide-react';
import { ReactNode } from 'react';

interface ButtonLoadingProps extends React.ComponentProps<typeof Button> {
  children: ReactNode;
  loading?: boolean;
}

export default function ButtonLoading({ children, loading = false, ...props }: ButtonLoadingProps) {
  return (
    <Button {...props} disabled={loading || props.disabled}>
      {loading && <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />}
      {children}
    </Button>
  );
}
