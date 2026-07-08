import { ACTION_ICONS } from '@/utils/config/icons.config';
import { Button } from '@datum-cloud/datum-ui/button';
import { toast } from '@datum-cloud/datum-ui/toast';
import { Tooltip } from '@datum-cloud/datum-ui/tooltip';

interface ButtonCopyProps {
  value: string;
  successMessage?: string;
  errorMessage?: string;
  tooltipText?: string;
  size?: 'sm' | 'default' | 'lg';
  variant?: 'ghost' | 'outline' | 'default';
}

function ButtonCopy({
  value,
  successMessage = 'Copied to clipboard',
  errorMessage = 'Failed to copy',
  tooltipText = 'Copy',
  size = 'sm',
  variant = 'ghost',
}: ButtonCopyProps) {
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(successMessage);
    } catch (err) {
      toast.error(errorMessage);
    }
  };

  // Map old variant to new type/theme
  const getButtonProps = () => {
    switch (variant) {
      case 'ghost':
        return { type: 'tertiary' as const, theme: 'borderless' as const };
      case 'outline':
        return { type: 'secondary' as const, theme: 'outline' as const };
      case 'default':
      default:
        return { type: 'primary' as const, theme: 'solid' as const };
    }
  };

  const buttonProps = getButtonProps();

  return (
    <Tooltip message={tooltipText}>
      <Button
        data-slot="button-copy"
        type={buttonProps.type}
        theme={buttonProps.theme}
        size="icon"
        onClick={handleCopy}
        className={size === 'sm' ? 'h-6 w-6' : 'h-8 w-8'}>
        <ACTION_ICONS.copy className={size === 'sm' ? 'h-4 w-4' : 'h-4 w-4'} />
      </Button>
    </Tooltip>
  );
}

export default ButtonCopy;
