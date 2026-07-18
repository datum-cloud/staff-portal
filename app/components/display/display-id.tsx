import { ButtonCopy } from '@/components/button';
import { cn } from '@datum-cloud/datum-ui/utils';

function truncateMiddle(str: string, maxLength = 16) {
  if (str.length <= maxLength) return str;
  const half = Math.floor((maxLength - 3) / 2);
  return `${str.slice(0, half)}...${str.slice(-half)}`;
}

function IDDisplay({ value, className }: { value: string; className?: string }) {
  return (
    <div className={cn('flex items-center space-x-2', className)}>
      <span className="font-mono text-xs">{truncateMiddle(value)}</span>
      <ButtonCopy value={value} />
    </div>
  );
}

export default IDDisplay;
