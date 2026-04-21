import { Button } from '@datum-cloud/datum-ui/button';
import { Dialog } from '@datum-cloud/datum-ui/dialog';
import { Form, type NormalizedFormInstance } from '@datum-cloud/datum-ui/form';
import { ReactNode, useState } from 'react';
import { z } from 'zod';

interface DialogFormProps<TValues extends Record<string, unknown>> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  submitText?: string;
  cancelText?: string;
  onSubmit: (data: TValues) => Promise<void> | void;
  onCancel?: () => void;
  schema: z.ZodType<TValues>;
  defaultValues?: TValues;
  children: ((form: NormalizedFormInstance) => ReactNode) | ReactNode;
}

export default function DialogForm<TValues extends Record<string, unknown>>({
  open,
  onOpenChange,
  title,
  description,
  submitText = 'Submit',
  cancelText = 'Cancel',
  onSubmit,
  onCancel,
  schema,
  defaultValues = {} as TValues,
  children,
}: DialogFormProps<TValues>) {
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (data: TValues) => {
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
      <Dialog.Content className="sm:max-w-md">
        <Dialog.Header title={title} description={description} />

        <Form.Root
          schema={schema}
          defaultValues={defaultValues}
          onSubmit={handleSubmit}
          className="space-y-4">
          {({ form, isSubmitting, isDirty, isValid }) => {
            const isBusy = isLoading || isSubmitting;
            return (
              <>
                <Dialog.Body className="space-y-4 px-5">
                  {typeof children === 'function' ? children(form) : children}
                </Dialog.Body>

                <Dialog.Footer className="gap-2">
                  <Button
                    type="tertiary"
                    theme="borderless"
                    htmlType="button"
                    onClick={handleCancel}
                    disabled={isBusy}
                    className="flex-1 sm:flex-none">
                    <span>{cancelText}</span>
                  </Button>
                  <Button
                    type="primary"
                    theme="solid"
                    htmlType="submit"
                    loading={isBusy}
                    disabled={!isDirty || !isValid || isBusy}
                    className="flex-1 sm:flex-none">
                    <span>{submitText}</span>
                  </Button>
                </Dialog.Footer>
              </>
            );
          }}
        </Form.Root>
      </Dialog.Content>
    </Dialog>
  );
}
