import ButtonLoading from '@/components/button-loading';
import { Button } from '@/modules/shadcn/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/modules/shadcn/ui/dialog';
import { Input } from '@/modules/shadcn/ui/input';
import { Trans } from '@lingui/react/macro';
import { useState } from 'react';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'destructive';
  onConfirm: () => Promise<void> | void;
  onCancel?: () => void;
  requireConfirmation?: boolean;
  confirmationText?: string;
}

export default function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'default',
  onConfirm,
  onCancel,
  requireConfirmation = false,
  confirmationText = 'DELETE',
}: ConfirmDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [confirmationInput, setConfirmationInput] = useState('');

  const handleConfirm = async () => {
    if (requireConfirmation && confirmationInput !== confirmationText) {
      return;
    }

    setIsLoading(true);
    try {
      await onConfirm();
      onOpenChange(false);
      // Reset confirmation input when dialog closes
      setConfirmationInput('');
    } catch (error) {
      console.error('Error during confirmation:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    if (!isLoading) {
      onCancel?.();
      onOpenChange(false);
      // Reset confirmation input when dialog closes
      setConfirmationInput('');
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    // Only allow closing if not loading
    if (!isLoading) {
      onOpenChange(newOpen);
      // Reset confirmation input when dialog closes
      if (!newOpen) {
        setConfirmationInput('');
      }
    }
  };

  const isConfirmDisabled = requireConfirmation && confirmationInput !== confirmationText;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {requireConfirmation && (
          <div className="flex flex-col gap-2">
            <label htmlFor="confirmation-input" className="text-sm font-medium">
              <Trans>
                Enter the word <strong>{confirmationText}</strong> to perform this action.
              </Trans>
            </label>
            <Input
              id="confirmation-input"
              value={confirmationInput}
              onChange={(e) => setConfirmationInput(e.target.value)}
              disabled={isLoading}
            />
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isLoading}
            className="flex-1 sm:flex-none">
            <span>{cancelText}</span>
          </Button>
          <ButtonLoading
            variant={variant === 'destructive' ? 'destructive' : 'default'}
            onClick={handleConfirm}
            loading={isLoading}
            disabled={isConfirmDisabled}
            className="flex-1 sm:flex-none">
            <span>{confirmText}</span>
          </ButtonLoading>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
