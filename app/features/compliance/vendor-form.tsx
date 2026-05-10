import {
  DATA_CATEGORIES,
  DATA_SUBJECT_TYPES,
  PHASES,
  RISK_TIERS,
  TRANSFER_MECHANISMS,
  type Vendor,
  type VendorSpec,
} from './types';
import { MultiSelect } from '@/components/multi-select';
import { Button } from '@datum-cloud/datum-ui/button';
import { Form, useWatch, type FormFieldRenderProps } from '@datum-cloud/datum-ui/form';
import { Text } from '@datum-cloud/datum-ui/typography';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import { useEffect, useState } from 'react';
import { z } from 'zod';

const DATA_CATEGORY_OPTIONS = DATA_CATEGORIES.map((value) => ({ value, label: value }));
const DATA_SUBJECT_TYPE_OPTIONS = DATA_SUBJECT_TYPES.map((value) => ({ value, label: value }));

export function slugifyName(input: string): string {
  // Strip combining diacritical marks (U+0300–U+036F) so accented characters
  // collapse into their base letter rather than turning into hyphens.
  return input
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 63)
    .replace(/-+$/, '');
}

function csvToList<T extends string>(value: string, allowed: readonly T[]): T[] {
  const set = new Set(allowed);
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((s): s is T => set.has(s as T));
}

export function effectiveDateToApi(value?: Date): string | undefined {
  if (!value) return undefined;
  if (Number.isNaN(value.getTime())) return undefined;
  // Pin to UTC midnight so the round-trip is stable regardless of the user's
  // local timezone — the CRD only cares about the calendar date.
  const yyyy = value.getUTCFullYear().toString().padStart(4, '0');
  const mm = (value.getUTCMonth() + 1).toString().padStart(2, '0');
  const dd = value.getUTCDate().toString().padStart(2, '0');
  return `${yyyy}-${mm}-${dd}T00:00:00Z`;
}

export function effectiveDateToForm(value?: string): Date | undefined {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

export const vendorFormSchema = z
  .object({
    name: z
      .string()
      .min(1, 'Name is required')
      .regex(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/, 'Must be a valid Kubernetes name'),
    displayName: z.string().min(1, 'Display name is required'),
    legalEntity: z.string().min(1, 'Legal entity is required'),
    countryOfIncorporation: z
      .string()
      .min(2, 'Country code is required')
      .max(2, 'Use a 2-letter ISO 3166-1 alpha-2 country code')
      .regex(/^[A-Z]{2}$/, 'Use uppercase ISO 3166-1 alpha-2 (e.g., US, DE)'),
    website: z.string().optional(),

    hasComplianceProfile: z.boolean(),
    purpose: z.string().optional(),
    dataCategories: z.array(z.enum(DATA_CATEGORIES)).default([]),
    dataSubjectTypes: z.array(z.enum(DATA_SUBJECT_TYPES)).default([]),
    processingRegionsCsv: z.string().optional(),
    transferMechanism: z.enum(TRANSFER_MECHANISMS).optional(),
    riskTier: z.enum(RISK_TIERS).optional(),
    phase: z.enum(PHASES).optional(),
    dpaReference: z.string().optional(),
    // The DatePicker can hand us either a Date or an ISO string depending on
    // adapter; coerce.date() accepts both and normalises to Date.
    effectiveDate: z.coerce.date().optional(),
  })
  .superRefine((values, ctx) => {
    if (!values.hasComplianceProfile) return;

    if (!values.purpose || values.purpose.trim().length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['purpose'],
        message: 'Purpose is required when a compliance profile is enabled',
      });
    }

    if ((values.dataCategories ?? []).length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['dataCategories'],
        message: 'At least one data category is required',
      });
    }

    if (!values.transferMechanism) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['transferMechanism'],
        message: 'Transfer mechanism is required',
      });
    }
    if (!values.riskTier) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['riskTier'],
        message: 'Risk tier is required',
      });
    }
    if (!values.phase) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['phase'],
        message: 'Phase is required',
      });
    }
  });

export type VendorFormValues = z.infer<typeof vendorFormSchema>;

export function vendorToFormValues(vendor: Vendor): VendorFormValues {
  const profile = vendor.spec?.complianceProfile;
  return {
    name: vendor.metadata?.name ?? '',
    displayName: vendor.spec?.displayName ?? '',
    legalEntity: vendor.spec?.legalEntity ?? '',
    countryOfIncorporation: vendor.spec?.countryOfIncorporation ?? '',
    website: vendor.spec?.website ?? '',
    hasComplianceProfile: !!profile,
    purpose: profile?.purpose ?? '',
    dataCategories: [...(profile?.dataCategories ?? [])],
    dataSubjectTypes: [...(profile?.dataSubjectTypes ?? [])],
    processingRegionsCsv: (profile?.processingRegions ?? []).join(', '),
    transferMechanism: profile?.transferMechanism,
    riskTier: profile?.riskTier,
    phase: profile?.phase,
    dpaReference: profile?.dpaReference ?? '',
    effectiveDate: effectiveDateToForm(profile?.effectiveDate),
  };
}

export function formValuesToSpec(values: VendorFormValues): VendorSpec {
  const spec: VendorSpec = {
    displayName: values.displayName,
    legalEntity: values.legalEntity,
    countryOfIncorporation: values.countryOfIncorporation,
    website: values.website?.trim() || undefined,
  };

  if (values.hasComplianceProfile) {
    const processingRegions = (values.processingRegionsCsv ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    spec.complianceProfile = {
      purpose: values.purpose ?? '',
      dataCategories: values.dataCategories ?? [],
      dataSubjectTypes: values.dataSubjectTypes ?? [],
      processingRegions: processingRegions.length > 0 ? processingRegions : undefined,
      transferMechanism: values.transferMechanism!,
      riskTier: values.riskTier!,
      phase: values.phase!,
      dpaReference: values.dpaReference?.trim() || undefined,
      effectiveDate: effectiveDateToApi(values.effectiveDate),
    };
  }

  return spec;
}

export const emptyVendorFormValues: VendorFormValues = {
  name: '',
  displayName: '',
  legalEntity: '',
  countryOfIncorporation: '',
  website: '',
  hasComplianceProfile: false,
  purpose: '',
  dataCategories: [],
  dataSubjectTypes: [],
  processingRegionsCsv: '',
  transferMechanism: undefined,
  riskTier: undefined,
  phase: 'Draft',
  dpaReference: '',
  effectiveDate: undefined,
};

function NameAutoInput({
  control,
  displayName,
}: {
  control: FormFieldRenderProps['control'];
  displayName: string;
}) {
  const [isAuto, setIsAuto] = useState(true);

  useEffect(() => {
    if (!isAuto) return;
    const slug = slugifyName(displayName);
    if (slug !== control.value) {
      control.change(slug);
    }
    // control is captured from the latest render; including it in deps would
    // re-run on every keystroke and recurse via control.change().
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayName, isAuto]);

  return (
    <Form.Input
      placeholder="acme-corp"
      value={(control.value as string) ?? ''}
      onChange={(e) => {
        setIsAuto(false);
        control.change(e.target.value);
      }}
    />
  );
}

function VendorNameField() {
  const displayName = useWatch<string>('displayName') ?? '';
  return (
    <Form.Field
      name="name"
      label={t`Name`}
      required
      description={t`Auto-generated from the display name. Edit to override.`}>
      {({ control }) => <NameAutoInput control={control} displayName={displayName} />}
    </Form.Field>
  );
}

interface VendorFormFieldsProps {
  showName?: boolean;
}

export function VendorFormFields({ showName = false }: VendorFormFieldsProps) {
  return (
    <>
      <Form.Field name="displayName" label={t`Display Name`} required>
        <Form.Input placeholder="Acme Corporation" />
      </Form.Field>
      {showName && <VendorNameField />}
      <Form.Field name="legalEntity" label={t`Legal Entity`} required>
        <Form.Input placeholder="Acme Corporation, Inc." />
      </Form.Field>
      <Form.Field
        name="countryOfIncorporation"
        label={t`Country of Incorporation`}
        required
        description={t`ISO 3166-1 alpha-2 (e.g., US, DE).`}>
        <Form.Input maxLength={2} placeholder="US" />
      </Form.Field>
      <Form.Field name="website" label={t`Website`}>
        <Form.Input placeholder="https://example.com" />
      </Form.Field>

      <div className="border-t pt-4">
        <Form.Field name="hasComplianceProfile">
          <Form.Switch label={t`Vendor processes personal data`} />
        </Form.Field>
        <Text size="sm" textColor="muted" className="mt-1">
          <Trans>
            Enable this to record a compliance profile. Vendors with an Active profile generate a
            public Subprocessor disclosure.
          </Trans>
        </Text>
      </div>

      <Form.When field="hasComplianceProfile" is={true}>
        <div className="space-y-4 rounded-md border border-dashed p-4">
          <Form.Field name="purpose" label={t`Purpose`} required>
            <Form.Textarea rows={3} placeholder={t`What does this vendor do with personal data?`} />
          </Form.Field>
          <Form.Field name="dataCategories" label={t`Data Categories`} required>
            {({ control }) => (
              <MultiSelect
                options={DATA_CATEGORY_OPTIONS}
                placeholder={t`Select data categories...`}
                value={(control.value as string[]) ?? []}
                onValueChange={(next) => control.change(next)}
                modalPopover
                maxCount={-1}
              />
            )}
          </Form.Field>
          <Form.Field
            name="dataSubjectTypes"
            label={t`Data Subject Types`}
            tooltip={t`Whose data the vendor processes. organization-admin = org admins on the platform; consumer = end users of service providers built on Datum; platform-staff = Datum Cloud employees. Pick all that apply.`}>
            {({ control }) => (
              <MultiSelect
                options={DATA_SUBJECT_TYPE_OPTIONS}
                placeholder={t`Select data subject types...`}
                value={(control.value as string[]) ?? []}
                onValueChange={(next) => control.change(next)}
                modalPopover
                maxCount={-1}
              />
            )}
          </Form.Field>
          <Form.Field
            name="processingRegionsCsv"
            label={t`Processing Regions`}
            description={t`Comma-separated ISO country codes or named regions (e.g., US, EU).`}>
            <Form.Input placeholder="US, EU" />
          </Form.Field>
          <Form.Field
            name="transferMechanism"
            label={t`Transfer Mechanism`}
            required
            tooltip={t`Legal basis for transferring personal data outside the EEA. SCCs = EC-approved Standard Contractual Clauses; AdequacyDecision = the vendor's region is covered by an EC adequacy decision (e.g. UK, Switzerland, Japan, EU–US Data Privacy Framework); BCRs = Binding Corporate Rules approved by a supervisory authority.`}>
            <Form.Select>
              {TRANSFER_MECHANISMS.map((m) => (
                <Form.SelectItem key={m} value={m}>
                  {m}
                </Form.SelectItem>
              ))}
            </Form.Select>
          </Form.Field>
          <Form.Field
            name="riskTier"
            label={t`Risk Tier`}
            required
            tooltip={t`Internal severity label. Drives review cadence and audit prioritisation; the controller does not act on it. Critical vendors typically need annual DPIA review and tighter monitoring; Low-tier vendors can be refreshed less often.`}>
            <Form.Select>
              {RISK_TIERS.map((tier) => (
                <Form.SelectItem key={tier} value={tier}>
                  {tier}
                </Form.SelectItem>
              ))}
            </Form.Select>
          </Form.Field>
          <Form.Field name="phase" label={t`Phase`} required>
            <Form.Select>
              {PHASES.map((p) => (
                <Form.SelectItem key={p} value={p}>
                  {p}
                </Form.SelectItem>
              ))}
            </Form.Select>
          </Form.Field>
          <Form.Field
            name="dpaReference"
            label={t`DPA Reference`}
            description={t`URL or document identifier for the Data Processing Agreement.`}>
            <Form.Input placeholder="https://docs.example.com/dpa" />
          </Form.Field>
          <Form.Field name="effectiveDate" label={t`Effective Date`}>
            <Form.DatePicker modal placeholder={t`Pick a date`} />
          </Form.Field>
        </div>
      </Form.When>
    </>
  );
}

interface VendorFormProps {
  defaultValues: VendorFormValues;
  onSubmit: (values: VendorFormValues) => void | Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
}

export function VendorForm({ defaultValues, onSubmit, onCancel, submitLabel }: VendorFormProps) {
  return (
    <Form.Root
      className="space-y-4"
      schema={vendorFormSchema}
      defaultValues={defaultValues}
      onSubmit={onSubmit}>
      {({ isSubmitting, isDirty, isValid }) => (
        <>
          <VendorFormFields />
          <div className="flex justify-end gap-2 pt-4">
            <Button type="tertiary" theme="borderless" htmlType="button" onClick={onCancel}>
              {t`Cancel`}
            </Button>
            <Button
              htmlType="submit"
              disabled={!isDirty || !isValid || isSubmitting}
              loading={isSubmitting}>
              {submitLabel ?? t`Update`}
            </Button>
          </div>
        </>
      )}
    </Form.Root>
  );
}
