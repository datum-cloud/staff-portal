import { hasAddress, normalizeContactValues } from '../../lib/contact-details';
import { t } from '@lingui/core/macro';
import { z } from 'zod';

/** Billing's own email check (internal/validation), so the form agrees with the webhook. */
const EMAIL = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const TAX_ID_TYPE = /^[a-z]{2}_[a-z][a-z_]*$/;

/**
 * The billing contact form's schema: billing's rules for contactInfo and
 * taxIds, checked as staff type. Billing checks them all again.
 */
export const buildContactSchema = () =>
  z
    .object({
      name: z
        .string()
        .max(256, t`Name is too long (256 characters max)`)
        .optional(),
      email: z.string(),
      businessName: z
        .string()
        .max(256, t`Business name is too long (256 characters max)`)
        .optional(),
      invoiceEmail: z.string().optional(),
      country: z.string().optional(),
      line1: z
        .string()
        .max(256, t`Address line 1 is too long (256 characters max)`)
        .optional(),
      line2: z
        .string()
        .max(256, t`Address line 2 is too long (256 characters max)`)
        .optional(),
      city: z
        .string()
        .max(128, t`City is too long (128 characters max)`)
        .optional(),
      region: z
        .string()
        .max(128, t`State or region is too long (128 characters max)`)
        .optional(),
      postalCode: z
        .string()
        .max(32, t`Postal code is too long (32 characters max)`)
        .optional(),
      taxIds: z.array(
        z.object({
          type: z.string(),
          value: z.string().max(64, t`Tax ID is too long (64 characters max)`),
        })
      ),
    })
    .superRefine((input, ctx) => {
      const values = normalizeContactValues(input);
      const issue = (path: (string | number)[], message: string) =>
        ctx.addIssue({ code: 'custom', path, message });

      const email = values.email.trim();
      if (!email) issue(['email'], t`Enter an email for the billing contact`);
      else if (!EMAIL.test(email)) issue(['email'], t`Enter a valid email address`);

      const invoiceEmail = values.invoiceEmail.trim();
      if (invoiceEmail && !EMAIL.test(invoiceEmail)) {
        issue(['invoiceEmail'], t`Enter a valid email address`);
      }

      if (hasAddress(values) && !/^[A-Z]{2}$/.test(values.country.trim())) {
        issue(['country'], t`Pick a country, which an address needs`);
      }

      const seen = new Set<string>();
      values.taxIds.forEach((taxId, index) => {
        const type = taxId.type.trim();
        if (!type) issue(['taxIds', index, 'type'], t`Pick a tax type`);
        else if (!TAX_ID_TYPE.test(type)) {
          issue(['taxIds', index, 'type'], t`Use the jurisdiction_scheme form, like gb_vat`);
        } else if (seen.has(type)) {
          issue(['taxIds', index, 'type'], t`The account already has a tax ID of this type`);
        }
        seen.add(type);
        if (!taxId.value.trim())
          issue(['taxIds', index, 'value'], t`Enter the registration number`);
      });
    });
