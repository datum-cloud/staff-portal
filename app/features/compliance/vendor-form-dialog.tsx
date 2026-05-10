import type { Vendor } from './types';
import {
  emptyVendorFormValues,
  formValuesToSpec,
  vendorFormSchema,
  VendorFormFields,
  vendorToFormValues,
  type VendorFormValues,
} from './vendor-form';
import { DialogForm } from '@/components/dialog';
import { useCreateVendorMutation, useUpdateVendorMutation } from '@/resources/request/client';
import { complianceRoutes } from '@/utils/config/routes.config';
import { toast } from '@datum-cloud/datum-ui/toast';
import { t } from '@lingui/core/macro';
import { useNavigate } from 'react-router';

interface VendorFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When provided, the dialog runs in edit mode against this vendor. */
  vendor?: Vendor;
  /**
   * Optional prefill for create mode (e.g. extracted from a contract PDF).
   * Ignored when `vendor` is provided.
   */
  prefilledValues?: VendorFormValues;
  /**
   * Stable identifier folded into the dialog's React key so the form
   * remounts (and re-applies defaults) when an external prefill source
   * changes — typically a hash of the source PDF or the import job id.
   */
  prefillKey?: string;
}

export function VendorFormDialog({
  open,
  onOpenChange,
  vendor,
  prefilledValues,
  prefillKey,
}: VendorFormDialogProps) {
  const navigate = useNavigate();
  const createVendorMutation = useCreateVendorMutation();
  const updateVendorMutation = useUpdateVendorMutation();

  const isEdit = !!vendor;
  const defaultValues = vendor
    ? vendorToFormValues(vendor)
    : (prefilledValues ?? emptyVendorFormValues);

  const dialogKey = vendor?.metadata?.name ?? prefillKey ?? 'new';

  return (
    <DialogForm
      key={`${dialogKey}-${open ? 'open' : 'closed'}`}
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? t`Edit Vendor` : t`New Vendor`}
      description={
        isEdit
          ? t`Update vendor details and compliance profile.`
          : t`Register a third-party vendor and optionally record its compliance profile.`
      }
      submitText={isEdit ? t`Save` : t`Create`}
      cancelText={t`Cancel`}
      schema={vendorFormSchema}
      defaultValues={defaultValues}
      contentClassName="sm:max-w-2xl"
      onSubmit={async (values: VendorFormValues) => {
        if (isEdit && vendor) {
          await updateVendorMutation.mutateAsync({
            name: vendor.metadata?.name ?? '',
            spec: formValuesToSpec(values),
          });
          toast.success(t`Vendor updated successfully`);
        } else {
          await createVendorMutation.mutateAsync({
            name: values.name,
            spec: formValuesToSpec(values),
          });
          toast.success(t`Vendor created successfully`);
          navigate(complianceRoutes.vendors.detail(values.name));
        }
      }}>
      <VendorFormFields showName={!isEdit} />
    </DialogForm>
  );
}
