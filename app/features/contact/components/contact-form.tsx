import { useUserSearch } from '@/hooks';
import { contactCreateMutation, contactUpdateMutation } from '@/resources/request/client';
import { Contact, User } from '@/resources/schemas';
import { contactRoutes, userRoutes } from '@/utils/config/routes.config';
import { generateMetadataName } from '@/utils/helpers';
import { Alert } from '@datum-ui/alert';
import { Button } from '@datum-ui/button';
import { Form } from '@datum-ui/form';
import { toast } from '@datum-ui/toast';
import { Text } from '@datum-ui/typography';
import { Trans, useLingui } from '@lingui/react/macro';
import * as React from 'react';
import { Link, useNavigate } from 'react-router';
import z from 'zod';

interface Props {
  contact?: Contact;
  user?: User;
}

export const ContactForm: React.FC<Props> = ({ contact, user }) => {
  const navigate = useNavigate();
  const { t } = useLingui();

  const {
    options: userOptions,
    isLoading: usersLoading,
    setSearch: setUserSearch,
  } = useUserSearch();

  const contactSchema = z
    .object({
      first_name: z.string().nonempty(t`First name is required`),
      last_name: z.string().nonempty(t`Last name is required`),
      email: z.email(t`Invalid email address`),
      has_association: z.boolean().optional(),
      subject: z.string().optional(),
    })
    .refine(
      (data) => {
        // Only validate subject requirement for new contacts (not editing)
        if (!contact && data.has_association && !data.subject) {
          return false;
        }
        return true;
      },
      {
        message: t`Subject is required when association is enabled`,
        path: ['subject'],
      }
    );

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
      const data = await contactCreateMutation({
        apiVersion: 'notification.miloapis.com/v1alpha1',
        kind: 'Contact',
        spec: {
          familyName: value.last_name,
          givenName: value.first_name,
          email: value.email,
          ...(value.has_association &&
            value.subject && {
              subject: {
                apiGroup: 'iam.miloapis.com',
                kind: 'User',
                name: value.subject,
                namespace: '',
              },
            }),
        },
        metadata: {
          name: generateMetadataName(
            [value.first_name, value.last_name, 'contact'].filter(Boolean).join('-')
          ),
          namespace: 'default',
        },
      });
      navigate(contactRoutes.edit(data.data.metadata.name));
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
        has_association: !!contact?.spec?.subject,
        subject: contact?.spec?.subject?.name || '',
      }}
      onSubmit={onSubmit}>
      {(form) => (
        <>
          <Form.Input field="first_name" label={t`First Name`} required />
          <Form.Input field="last_name" label={t`Last Name`} required />
          <Form.Input field="email" label={t`Email`} required />

          {user && (
            <div className="flex items-center gap-2">
              <Text size="sm" textColor="muted">
                <Trans>Associated with User: </Trans>
              </Text>

              <Text size="sm">
                <Link to={userRoutes.detail(user.metadata.name)}>
                  {user.spec.givenName} {user.spec.familyName} ({user.spec.email})
                </Link>
              </Text>
            </div>
          )}

          {!contact && (
            <>
              <Form.Switch field="has_association" label={t`Associate with User`} />

              {form.getValues('has_association') && (
                <>
                  <Form.Autocomplete
                    field="subject"
                    placeholder={usersLoading ? t`Loading users...` : t`Select a user...`}
                    searchPlaceholder={t`Search users...`}
                    options={userOptions}
                    isLoading={usersLoading}
                    onSearch={setUserSearch}
                    searchDebounceMs={300}
                    disabled={usersLoading}
                  />
                  <Alert
                    variant="warning"
                    title={t`Warning`}
                    description={t`Once a contact is associated with a user, this association cannot be removed or changed later.`}
                  />
                </>
              )}
            </>
          )}

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
