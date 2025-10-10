import { contactCreateMutation, contactUpdateMutation } from '@/resources/request/client';
import { Contact } from '@/resources/schemas';
import { contactRoutes } from '@/utils/config/routes.config';
import { generateMetadataName } from '@/utils/helpers';
import { Button } from '@datum-ui/button';
import { Form } from '@datum-ui/form';
import { toast } from '@datum-ui/toast';
import { useLingui } from '@lingui/react/macro';
import { useNavigate } from 'react-router';
import z from 'zod';

interface Props {
  contact?: Contact;
}

export const ContactForm: React.FC<Props> = ({ contact }) => {
  const navigate = useNavigate();
  const { t } = useLingui();

  const contactSchema = z.object({
    first_name: z.string().nonempty(t`First name is required`),
    last_name: z.string().nonempty(t`Last name is required`),
    email: z.email(t`Invalid email address`),
  });

  const onSubmit = async (value: z.infer<typeof contactSchema>) => {
    if (contact) {
      await contactUpdateMutation(contact.metadata.name, {
        spec: {
          familyName: value.last_name,
          givenName: value.first_name,
          email: value.email,
        },
      });
      toast.success(t`Contact updated successfully`);
    } else {
      await contactCreateMutation({
        apiVersion: 'notification.miloapis.com/v1alpha1',
        kind: 'Contact',
        spec: {
          familyName: value.last_name,
          givenName: value.first_name,
          email: value.email,
        },
        metadata: {
          name: generateMetadataName(
            [value.first_name, value.last_name, 'contact'].filter(Boolean).join('-')
          ),
          namespace: 'default',
        },
      });
      navigate(contactRoutes.list());
      toast.success(t`Contact created successfully`);
    }
  };

  return (
    <Form
      className="space-y-4"
      schema={contactSchema}
      defaultValues={{
        first_name: contact?.spec?.givenName ?? '',
        last_name: contact?.spec?.familyName ?? '',
        email: contact?.spec?.email ?? '',
      }}
      onSubmit={onSubmit}>
      {(form) => (
        <>
          <Form.Input field="first_name" label={t`First Name`} required />
          <Form.Input field="last_name" label={t`Last Name`} required />
          <Form.Input field="email" label={t`Email`} required />

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="tertiary"
              theme="borderless"
              onClick={() => navigate(contactRoutes.list())}>
              {t`Cancel`}
            </Button>
            <Button
              htmlType="submit"
              disabled={!form.formState.isDirty}
              loading={form.formState.isSubmitting}>
              {contact ? t`Update` : t`Create`}
            </Button>
          </div>
        </>
      )}
    </Form>
  );
};
