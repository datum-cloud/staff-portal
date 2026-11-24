import type { BillingAccount } from '../utils';

/**
 * Staff edit a billing account's contact details, address and tax IDs from
 * its Billing contact card. These turn the account into the form's values,
 * the values into the merge patch billing receives, and billing's field
 * paths back into the form's.
 */

export interface ContactTaxId {
  type: string;
  value: string;
}

export interface ContactFormValues {
  name: string;
  /** Required by billing: billing mail, and invoices without an invoice email. */
  email: string;
  businessName: string;
  /**
   * Where invoices are emailed. Stripe sends each invoice to one address,
   * the first of spec.contactInfo.invoiceEmails, so the form keeps one, as
   * the cloud portal does.
   */
  invoiceEmail: string;
  country: string;
  line1: string;
  line2: string;
  city: string;
  region: string;
  postalCode: string;
  taxIds: ContactTaxId[];
}

/**
 * The form's values with every text field a string. The form can hand back
 * an emptied field as undefined.
 */
export const normalizeContactValues = (
  values: Partial<Omit<ContactFormValues, 'taxIds'>> & { taxIds?: Partial<ContactTaxId>[] }
): ContactFormValues => ({
  name: values.name ?? '',
  email: values.email ?? '',
  businessName: values.businessName ?? '',
  invoiceEmail: values.invoiceEmail ?? '',
  country: values.country ?? '',
  line1: values.line1 ?? '',
  line2: values.line2 ?? '',
  city: values.city ?? '',
  region: values.region ?? '',
  postalCode: values.postalCode ?? '',
  taxIds: (values.taxIds ?? []).map((taxId) => ({
    type: taxId.type ?? '',
    value: taxId.value ?? '',
  })),
});

/** Tax ID types the cloud portal offers customers; billing accepts any `xx_scheme`. */
export const TAX_ID_TYPES: { value: string; label: string }[] = [
  { value: 'gb_vat', label: 'United Kingdom VAT' },
  { value: 'eu_vat', label: 'EU VAT' },
  { value: 'us_ein', label: 'United States EIN' },
  { value: 'ca_gst_hst', label: 'Canada GST/HST' },
  { value: 'au_abn', label: 'Australia ABN' },
  { value: 'ch_vat', label: 'Switzerland VAT' },
  { value: 'in_gst', label: 'India GST' },
  { value: 'sg_gst', label: 'Singapore GST' },
];

/** The tax types to offer: the usual ones, then any other the account has. */
export const taxIdTypeOptions = (current: ContactTaxId[]) => {
  const known = new Set(TAX_ID_TYPES.map((type) => type.value));
  const others = [...new Set(current.map((taxId) => taxId.type))]
    .filter((type) => type && !known.has(type))
    .map((type) => ({ value: type, label: type }));
  return [...TAX_ID_TYPES, ...others];
};

export const contactFormValues = (account: BillingAccount): ContactFormValues => {
  const contact = account.spec?.contactInfo;
  const address = contact?.address;
  return {
    name: contact?.name ?? '',
    email: contact?.email ?? '',
    businessName: contact?.businessName ?? '',
    invoiceEmail: contact?.invoiceEmails?.[0] ?? '',
    country: address?.country ?? '',
    line1: address?.line1 ?? '',
    line2: address?.line2 ?? '',
    city: address?.city ?? '',
    region: address?.region ?? '',
    postalCode: address?.postalCode ?? '',
    taxIds: (account.spec?.taxIds ?? []).map((taxId) => ({
      type: taxId.type ?? '',
      value: taxId.value ?? '',
    })),
  };
};

const ADDRESS_FIELDS = ['country', 'line1', 'line2', 'city', 'region', 'postalCode'] as const;

/** Whether any address field is filled in, which makes the country required. */
export const hasAddress = (values: Pick<ContactFormValues, (typeof ADDRESS_FIELDS)[number]>) =>
  ADDRESS_FIELDS.some((field) => values[field].trim() !== '');

export interface ContactMergePatch {
  spec: {
    contactInfo: {
      email: string;
      name: string | null;
      businessName: string | null;
      invoiceEmails: string[];
      address: {
        country: string;
        line1: string | null;
        line2: string | null;
        city: string | null;
        region: string | null;
        postalCode: string | null;
      } | null;
    };
    taxIds: ContactTaxId[];
  };
}

/**
 * The merge patch for the form's values. A merge patch keeps any key it
 * leaves out, so a cleared field is sent as null, which removes it. Lists
 * are replaced whole. Only contactInfo and taxIds are sent, so billing's
 * activity timeline reads it as an edit of the billing details.
 */
export const buildContactPatch = (values: ContactFormValues): ContactMergePatch => {
  const orNull = (value: string) => value.trim() || null;
  const invoiceEmail = values.invoiceEmail.trim().toLowerCase();
  return {
    spec: {
      contactInfo: {
        email: values.email.trim(),
        name: orNull(values.name),
        businessName: orNull(values.businessName),
        invoiceEmails: invoiceEmail ? [invoiceEmail] : [],
        address: hasAddress(values)
          ? {
              country: values.country.trim().toUpperCase(),
              line1: orNull(values.line1),
              line2: orNull(values.line2),
              city: orNull(values.city),
              region: orNull(values.region),
              postalCode: orNull(values.postalCode),
            }
          : null,
      },
      taxIds: values.taxIds.map((taxId) => ({
        type: taxId.type.trim(),
        value: taxId.value.trim(),
      })),
    },
  };
};

/** Whether saving the values would change nothing on the account. */
export const contactUnchanged = (account: BillingAccount, values: ContactFormValues) =>
  JSON.stringify(buildContactPatch(values)) ===
  JSON.stringify(buildContactPatch(contactFormValues(account)));

const FIELD_BY_PATH: Record<string, string> = {
  'spec.contactInfo': 'email',
  'spec.contactInfo.email': 'email',
  'spec.contactInfo.name': 'name',
  'spec.contactInfo.businessName': 'businessName',
  'spec.contactInfo.invoiceEmails': 'invoiceEmail',
  'spec.contactInfo.address': 'country',
  'spec.contactInfo.address.country': 'country',
  'spec.contactInfo.address.line1': 'line1',
  'spec.contactInfo.address.line2': 'line2',
  'spec.contactInfo.address.city': 'city',
  'spec.contactInfo.address.region': 'region',
  'spec.contactInfo.address.postalCode': 'postalCode',
};

/**
 * The form field for one of billing's field paths, such as
 * `spec.taxIds[1].type` → `taxIds.1.type`, or undefined when the form has
 * no field for it.
 */
export const contactFieldForPath = (path: string | undefined): string | undefined => {
  if (!path) return undefined;
  if (/^spec\.contactInfo\.invoiceEmails\[\d+\]$/.test(path)) return 'invoiceEmail';
  const taxId = /^spec\.taxIds\[(\d+)\](?:\.(type|value))?$/.exec(path);
  if (taxId) return `taxIds.${taxId[1]}.${taxId[2] ?? 'type'}`;
  return FIELD_BY_PATH[path];
};

/** ISO 3166-1 alpha-2, the codes billing and Stripe take for a country. */
const COUNTRY_CODES = `
  AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS
  BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE
  EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM
  HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC
  LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA
  NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW
  SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO
  TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW
`
  .trim()
  .split(/\s+/);

let countryOptions: { value: string; label: string }[] | undefined;

/** Every country billing can bill in, with its English name, by name. */
export const getCountryOptions = () => {
  if (countryOptions) return countryOptions;
  const names = new Intl.DisplayNames(['en'], { type: 'region', fallback: 'code' });
  countryOptions = COUNTRY_CODES.map((code) => ({
    value: code,
    label: names.of(code) ?? code,
  })).sort((a, b) => a.label.localeCompare(b.label));
  return countryOptions;
};

/** A country's name for its code, or the code when it has none. */
export const countryName = (code: string | undefined) =>
  code ? (getCountryOptions().find((option) => option.value === code)?.label ?? code) : '';
