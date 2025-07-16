import { cn } from '@/modules/shadcn/lib/utils';

interface DividerProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: 'horizontal' | 'vertical';
  size?: 'sm' | 'md' | 'lg' | 'xl'; // Predefined sizes instead of arbitrary thickness
  color?: string; // e.g. "border-muted", "border-gray-300", "border-primary"
  length?: string; // e.g. "w-full" or "h-full"
}

function Divider({
  orientation = 'horizontal',
  size = 'md',
  color = 'border-muted',
  length,
  className,
  ...props
}: DividerProps) {
  const isHorizontal = orientation === 'horizontal';

  // Size mapping for consistent thickness
  const sizeClasses = {
    sm: isHorizontal ? 'h-px' : 'w-px',
    md: isHorizontal ? 'h-0.5' : 'w-0.5',
    lg: isHorizontal ? 'h-1' : 'w-1',
    xl: isHorizontal ? 'h-2' : 'w-2',
  };

  return (
    <div
      role="separator"
      className={cn(
        'shrink-0 border-0',
        isHorizontal
          ? `w-full ${sizeClasses[size]} ${length ?? ''}`
          : `h-full ${sizeClasses[size]} ${length ?? ''}`,
        color,
        className
      )}
      {...props}
    />
  );
}

export default Divider;
