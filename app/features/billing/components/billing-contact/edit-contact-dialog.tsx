import {
  buildContactPatch,
  contactFieldForPath,
  contactFormValues,
  contactUnchanged,
  getCountryOptions,
  normalizeContactValues,
  taxIdTypeOptions,
  type ContactFormValues,
} from '../../lib/contact-details';
import { apiFieldErrors } from '../../lib/server-errors';
import { getBillingAccountDisplayName, type BillingAccount } from '../../utils';
import { ShowSubmitErrors } from '../contract-editor/show-submit-errors';
import { buildContactSchema } from './schema';
import { usePatchBillingAccountContactMutation } from '@/resources/request/client';
import { ACTION_ICONS } from '@/utils/config/icons.config';
import { Alert, AlertDescription } from '@datum-cloud/datum-ui/alert';
import { Button } from '@datum-cloud/datum-ui/button';
import { Dialog } from '@datum-cloud/datum-ui/dialog';
import { Form } from '@datum-cloud/datum-ui/form';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { toast } from '@datum-cloud/datum-ui/toast';
import { Text } from '@datum-cloud/datum-ui/typography';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import { Plus } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { FieldPath, UseFormReturn } from 'react-hook-form';

/**
 * Edits the account's billing contact, address and tax IDs, for when the
 * customer can't: one merge patch to spec.contactInfo and spec.taxIds.
 * Billing's refusals go on their fields, and the rest above the buttons.
 * Mount it only while it's open, so it starts from the account as it is.
 */
export function EditContactDialog({
  orgName,
  account,
  onClose,
}: {
  orgName: string;
  account: BillingAccount;
  onClose: () => void;
}) {
  const accountName = account.metadata?.name ?? '';
  const patchContact = usePatchBillingAccountContactMutation(orgName, accountName);
  const schema = useMemo(() => buildContactSchema(), []);
  const [defaultValues] = useState(() => contactFormValues(account));
  const formRef = useRef<FormHandle | null>(null);
  // What billing refused that isn't one field's, shown above the buttons.
  const [formErrors, setFormErrors] = useState<string[]>([]);

  const handleSubmit = async (input: Parameters<typeof normalizeContactValues>[0]) => {
    const values = normalizeContactValues(input);
    setFormErrors([]);
    if (contactUnchanged(account, values)) {
      onClose();
      return;
    }
    try {
      await patchContact.mutateAsync(buildContactPatch(values));
      toast.success(t`Billing contact updated. Upcoming invoices use the new details.`);
      onClose();
    } catch (err) {
      const form = formRef.current;
      const unplaced: string[] = [];
      for (const error of apiFieldErrors(err, t`Couldn't save the billing contact.`)) {
        const field = contactFieldForPath(error.path);
        const message = error.raw.startsWith('Duplicate value')
          ? t`The account already has a tax ID of this type`
          : error.message;
        if (field && form) {
          form.form.setError(field as FieldPath<ContactFormValues>, { type: 'server', message });
          // A submit only touches top-level fields, and an untouched field
          // hides its error: a tax ID row's would stay hidden.
          form.markFieldTouched(field);
        } else {
          unplaced.push(message);
        }
      }
      setFormErrors(unplaced);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => (open ? undefined : onClose())}>
      <Dialog.Content className="sm:max-w-2xl">
        <Dialog.Header
          title={t`Edit billing contact`}
          description={t`${getBillingAccountDisplayName(account)}'s contact, address and tax IDs. Changes show on upcoming invoices and on the account's activity; past invoices keep theirs.`}
        />
        <Form.Root
          schema={schema}
          defaultValues={defaultValues}
          onSubmit={handleSubmit}
          className="flex min-h-0 flex-1 flex-col">
          {({ isSubmitting }) => {
            const busy = isSubmitting || patchContact.isPending;
            return (
              <>
                <ShowSubmitErrors />
                <FormBridge formRef={formRef} />
                <Dialog.Body className="flex flex-col gap-4 px-5 pt-0">
                  <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-2">
                    <Form.Field
                      name="name"
                      label={t`Contact name`}
                      description={t`The ATTN line on invoices.`}>
                      <Form.Input autoComplete="off" />
                    </Form.Field>
                    <Form.Field
                      name="email"
                      label={t`Contact email`}
                      description={t`Gets billing notifications.`}
                      required>
                      <Form.Input type="email" autoComplete="off" data-e2e="contact-email" />
                    </Form.Field>
                    <Form.Field
                      name="businessName"
                      label={t`Business name`}
                      description={t`The legal entity on invoices. Empty for a personal account.`}>
                      <Form.Input autoComplete="off" />
                    </Form.Field>
                    <InvoiceEmailField />
                  </div>

                  <AddressFields />
                  <TaxIdFields />
                  <FormErrors errors={formErrors} />
                </Dialog.Body>
                <Dialog.Footer className="gap-2">
                  <Button
                    type="quaternary"
                    theme="borderless"
                    htmlType="button"
                    disabled={busy}
                    onClick={onClose}>
                    <Trans>Cancel</Trans>
                  </Button>
                  <Button htmlType="submit" loading={busy} disabled={busy}>
                    <Trans>Save</Trans>
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

/** The invoice email, whose help names the contact email as typed. */
function InvoiceEmailField() {
  const contactEmail = ((Form.useWatch('email') as string | undefined) ?? '').trim();
  return (
    <Form.Field
      name="invoiceEmail"
      label={t`Invoice email`}
      description={
        contactEmail
          ? t`Where invoices are emailed. Empty sends them to the contact email (${contactEmail}).`
          : t`Where invoices are emailed. Empty sends them to the contact email.`
      }>
      <Form.Input
        type="email"
        autoComplete="off"
        placeholder={contactEmail || undefined}
        data-e2e="invoice-email"
      />
    </Form.Field>
  );
}

function AddressFields() {
  const country = (Form.useWatch('country') as string | undefined) ?? '';
  // An account's country that isn't on the list stays pickable.
  const countries = useMemo(() => {
    const options = getCountryOptions();
    return country && !options.some((option) => option.value === country)
      ? [{ value: country, label: country }, ...options]
      : options;
  }, [country]);

  return (
    <div className="flex flex-col gap-3 border-t pt-4">
      <Text size="sm" weight="semibold">
        <Trans>Billing address</Trans>
      </Text>
      <Form.Field name="line1" label={t`Address line 1`}>
        <Form.Input autoComplete="off" />
      </Form.Field>
      <Form.Field name="line2" label={t`Address line 2`}>
        <Form.Input autoComplete="off" />
      </Form.Field>
      <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-2">
        <Form.Field name="city" label={t`City`}>
          <Form.Input autoComplete="off" />
        </Form.Field>
        <Form.Field name="region" label={t`State or region`}>
          <Form.Input autoComplete="off" />
        </Form.Field>
        <Form.Field name="postalCode" label={t`Postal code`}>
          <Form.Input autoComplete="off" />
        </Form.Field>
        <Form.Field
          name="country"
          label={t`Country`}
          description={t`Needed with an address. Sets the account's tax.`}>
          <Form.Autocomplete
            modal
            virtualize
            options={countries}
            placeholder={t`Pick a country`}
            searchPlaceholder={t`Search countries`}
          />
        </Form.Field>
      </div>
    </div>
  );
}

function TaxIdFields() {
  const taxIds = (Form.useWatch('taxIds') as ContactFormValues['taxIds'] | undefined) ?? [];
  const types = taxIdTypeOptions(taxIds);
  return (
    <div className="flex flex-col gap-3 border-t pt-4">
      <div className="flex flex-col gap-1">
        <Text size="sm" weight="semibold">
          <Trans>Tax IDs</Trans>
        </Text>
        <Text size="xs" textColor="muted">
          <Trans>One per tax registration, each of a different type.</Trans>
        </Text>
      </div>
      <Form.FieldArray name="taxIds">
        {({ fields, append, remove }) => (
          <div className="flex flex-col gap-3">
            {fields.map((field, index) => (
              <div
                key={field.key}
                className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-start gap-2">
                <Form.Field name={`taxIds.${index}.type`} label={t`Type`} required>
                  <Form.Autocomplete
                    modal
                    creatable
                    options={types}
                    placeholder={t`Pick a tax type`}
                    searchPlaceholder={t`Search or enter a type, like gb_vat`}
                  />
                </Form.Field>
                <Form.Field name={`taxIds.${index}.value`} label={t`Registration number`} required>
                  <Form.Input autoComplete="off" placeholder="GB123456789" />
                </Form.Field>
                <Button
                  type="quaternary"
                  theme="borderless"
                  size="small"
                  htmlType="button"
                  className="mt-6"
                  aria-label={t`Remove tax ID ${index + 1}`}
                  icon={<Icon icon={ACTION_ICONS.close} size={14} />}
                  onClick={() => remove(index)}
                />
              </div>
            ))}
            <Button
              type="quaternary"
              theme="outline"
              size="small"
              htmlType="button"
              className="w-fit"
              icon={<Icon icon={Plus} size={14} />}
              onClick={() => append({ type: '', value: '' })}>
              <Trans>Add tax ID</Trans>
            </Button>
          </div>
        )}
      </Form.FieldArray>
    </div>
  );
}

interface FormHandle {
  form: UseFormReturn<ContactFormValues>;
  markFieldTouched: (name: string) => void;
}

/** Keeps a handle on the form, for placing billing's refusals on their fields. */
function FormBridge({ formRef }: { formRef: { current: FormHandle | null } }) {
  const context = Form.useFormContext();
  const form = context.form.raw as UseFormReturn<ContactFormValues>;
  const { markFieldTouched } = context;
  useEffect(() => {
    formRef.current = { form, markFieldTouched };
  }, [form, markFieldTouched, formRef]);
  return null;
}

function FormErrors({ errors }: { errors: string[] }) {
  if (errors.length === 0) return null;
  return (
    <Alert variant="destructive">
      <AlertDescription>
        {errors.map((error) => (
          <p key={error}>{error}</p>
        ))}
      </AlertDescription>
    </Alert>
  );
}
