import { useUserSearch } from '@/hooks';
import {
  contactCreateMutation,
  contactGroupMembershipCreateMutation,
  contactUpdateMutation,
  useContactGroupListQuery,
} from '@/resources/request/client';
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

  const { data: contactGroups, isLoading: contactGroupsLoading } = useContactGroupListQuery();

  const contactSchema = z
    .object({
      first_name: z.string().nonempty(t`First name is required`),
      last_name: z.string().nonempty(t`Last name is required`),
      email: z.email(t`Invalid email address`),
      has_association: z.boolean().optional(),
      subject: z.string().optional(),
      has_groups: z.boolean().optional(),
      groups: z.array(z.string()).optional(),
    })
    .refine(
      (data) => {
        if (!contact && data.has_association && !data.subject) {
          return false;
        }
        return true;
      },
      {
        message: t`Subject is required when user association is enabled`,
        path: ['subject'],
      }
    )
    .refine(
      (data) => {
        if (!contact && data.has_groups && !data.groups?.length) {
          return false;
        }
        return true;
      },
      {
        message: t`Groups are required when groups association is enabled`,
        path: ['groups'],
      }
    );

  const onSubmit = async (value: z.infer<typeof contactSchema>) => {
    console.log(value);
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
        metadata: {
          generateName: 'contact-',
          namespace: 'default',
        },
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
      });

      // Auto associate with groups
      if (value.has_groups && value.groups?.length) {
        await Promise.all(
          value.groups.map(async (group) => {
            await contactGroupMembershipCreateMutation({
              apiVersion: 'notification.miloapis.com/v1alpha1',
              kind: 'ContactGroupMembership',
              metadata: {
                generateName: 'contact-group-membership-',
                namespace: 'default',
              },
              spec: {
                contactGroupRef: { name: group, namespace: 'default' },
                contactRef: { name: data.data.metadata.name, namespace: 'default' },
              },
            });
          })
        );
      }

      navigate(contactRoutes.edit(data.data.metadata.namespace, data.data.metadata.name));
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
        has_groups: false,
        groups: [],
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
                  <Form.Autosearch
                    field="subject"
                    placeholder={t`Enter the full email to search...`}
                    options={userOptions}
                    isLoading={usersLoading}
                    onSearch={setUserSearch}
                    searchDebounceMs={500}
                  />
                  <Alert
                    variant="warning"
                    title={t`Warning`}
                    description={t`Once a contact is associated with a user, this association cannot be removed or changed later.`}
                  />
                </>
              )}

              <Form.Switch field="has_groups" label={t`Associate with Groups`} />
              {form.getValues('has_groups') && (
                <Form.Transfer
                  field="groups"
                  dataSource={(contactGroups?.data?.items ?? []).map((group) => ({
                    value: group.metadata.name,
                    label: group.spec.displayName,
                    key: group.metadata.name,
                  }))}
                />
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
