import { Button } from '@/components/button';
import { Form } from '@/components/form';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/modules/shadcn/ui/dialog';
import { ReactNode, useState } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { ZodSchema, z } from 'zod';

interface DialogFormProps<TSchema extends ZodSchema> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  submitText?: string;
  cancelText?: string;
  onSubmit: (data: z.infer<TSchema>) => Promise<void> | void;
  onCancel?: () => void;
  schema: TSchema;
  defaultValues?: z.infer<TSchema>;
  children: ((form: UseFormReturn<z.infer<TSchema>>) => ReactNode) | ReactNode;
}

export default function DialogForm<TSchema extends ZodSchema>({
  open,
  onOpenChange,
  title,
  description,
  submitText = 'Submit',
  cancelText = 'Cancel',
  onSubmit,
  onCancel,
  schema,
  defaultValues = {} as z.infer<TSchema>,
  children,
}: DialogFormProps<TSchema>) {
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (data: z.infer<TSchema>) => {
    setIsLoading(true);
    try {
      await onSubmit(data);
      onOpenChange(false);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    if (!isLoading) {
      onCancel?.();
      onOpenChange(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    // Only allow closing if not loading
    if (!isLoading) {
      onOpenChange(newOpen);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <Form
          schema={schema}
          defaultValues={defaultValues}
          onSubmit={handleSubmit}
          shouldFocusError={true}
          className="space-y-4">
          {(form) => (
            <>
              <div className="space-y-4">
                {typeof children === 'function' ? children(form) : children}
              </div>

              <DialogFooter className="gap-2">
                <Button
                  type="tertiary"
                  theme="borderless"
                  htmlType="button"
                  onClick={handleCancel}
                  disabled={isLoading}
                  className="flex-1 sm:flex-none">
                  <span>{cancelText}</span>
                </Button>
                <Button
                  type="primary"
                  theme="solid"
                  htmlType="submit"
                  loading={isLoading}
                  disabled={isLoading}
                  className="flex-1 sm:flex-none">
                  <span>{submitText}</span>
                </Button>
              </DialogFooter>
            </>
          )}
        </Form>
      </DialogContent>
    </Dialog>
  );
}
