import { useUserSearch } from '@/hooks';
import {
  contactCreateMutation,
  contactGroupMembershipCreateMutation,
  contactUpdateMutation,
  useContactGroupListQuery,
} from '@/resources/request/client';
import { contactRoutes, userRoutes } from '@/utils/config/routes.config';
import { Alert, AlertDescription, AlertTitle } from '@datum-cloud/datum-ui/alert';
import { Button } from '@datum-cloud/datum-ui/button';
import { Checkbox } from '@datum-cloud/datum-ui/checkbox';
import { Form } from '@datum-cloud/datum-ui/form';
import { toast } from '@datum-cloud/datum-ui/toast';
import { Text } from '@datum-cloud/datum-ui/typography';
import { Trans, useLingui } from '@lingui/react/macro';
import { ComMiloapisIamV1Alpha1User } from '@openapi/iam.miloapis.com/v1alpha1';
import { ComMiloapisNotificationV1Alpha1Contact } from '@openapi/notification.miloapis.com/v1alpha1';
import { Loader2 } from 'lucide-react';
import * as React from 'react';
import { Link, useNavigate } from 'react-router';
import z from 'zod';

interface Props {
  contact?: ComMiloapisNotificationV1Alpha1Contact;
  user?: ComMiloapisIamV1Alpha1User;
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
    );

  const onSubmit = async (value: z.infer<typeof contactSchema>) => {
    if (contact) {
      await contactUpdateMutation(contact.metadata, {
        familyName: value.last_name,
        givenName: value.first_name,
        email: value.email,
      });
      toast.success(t`Contact updated successfully`);
    } else {
      const response = await contactCreateMutation('default', {
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
      });

      const contactName = response.metadata?.name ?? '';
      const contactNamespace = response.metadata?.namespace ?? '';

      // Auto associate with groups
      if (value.groups?.length) {
        await Promise.all(
          value.groups.map(async (group) => {
            await contactGroupMembershipCreateMutation('default', {
              contactGroupRef: { name: group, namespace: 'default' },
              contactRef: { name: contactName, namespace: contactNamespace },
            });
          })
        );
      }

      navigate(contactRoutes.detail(contactNamespace, contactName));
      toast.success(t`Contact created successfully`);
    }
  };

  return (
    <Form.Root
      className="space-y-4"
      schema={contactSchema}
      defaultValues={{
        first_name: contact?.spec?.givenName ?? '',
        last_name: contact?.spec?.familyName ?? '',
        email: contact?.spec?.email ?? '',
        has_association: !!contact?.spec?.subject,
        subject: contact?.spec?.subject?.name || '',
        groups: [],
      }}
      onSubmit={onSubmit}>
      {({ isSubmitting, isDirty, isValid }) => (
        <>
          <Form.Field name="first_name" label={t`First Name`} required>
            <Form.Input />
          </Form.Field>
          <Form.Field name="last_name" label={t`Last Name`} required>
            <Form.Input />
          </Form.Field>
          <Form.Field name="email" label={t`Email`} required>
            <Form.Input />
          </Form.Field>

          {user && (
            <div className="flex items-center gap-2">
              <Text size="sm" textColor="muted">
                <Trans>Associated with User: </Trans>
              </Text>

              <Text size="sm">
                <Link to={userRoutes.detail(user.metadata?.name ?? '')}>
                  {user.spec?.givenName ?? ''} {user.spec?.familyName ?? ''} (
                  {user.spec?.email ?? ''})
                </Link>
              </Text>
            </div>
          )}

          {!contact && (
            <>
              {contactGroupsLoading ? (
                <div className="flex items-center py-2">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  <Text>{t`Loading mail lists...`}</Text>
                </div>
              ) : (
                <Form.Field name="groups" label={t`Mail Lists`}>
                  {({ control }) => {
                    const selectedGroups = Array.isArray(control.value)
                      ? (control.value as string[])
                      : [];

                    return (
                      <div className="space-y-2">
                        {(contactGroups?.items ?? []).map((group) => {
                          const value = group.metadata?.name ?? '';
                          const checked = selectedGroups.includes(value);

                          return (
                            <label key={value} className="flex items-center gap-2">
                              <Checkbox
                                checked={checked}
                                onCheckedChange={(nextChecked) => {
                                  const shouldCheck = Boolean(nextChecked);
                                  const nextValues = shouldCheck
                                    ? [...selectedGroups, value]
                                    : selectedGroups.filter((item) => item !== value);
                                  control.change(nextValues);
                                }}
                              />
                              <Text size="sm">{group.spec?.displayName ?? value}</Text>
                            </label>
                          );
                        })}
                      </div>
                    );
                  }}
                </Form.Field>
              )}

              <hr />
              <Form.Field name="has_association">
                <Form.Switch label={t`Associate with User`} />
              </Form.Field>
              <Form.When field="has_association" is={true}>
                <>
                  <Form.Field name="subject">
                    <Form.Autosearch
                      options={userOptions}
                      onSearch={setUserSearch}
                      loading={usersLoading}
                      placeholder={t`Enter the full email to search...`}
                      searchDebounceMs={500}
                    />
                  </Form.Field>
                  <Alert variant="warning">
                    <AlertTitle>{t`Warning`}</AlertTitle>
                    <AlertDescription>{t`Once a contact is associated with a user, this association cannot be removed or changed later.`}</AlertDescription>
                  </Alert>
                </>
              </Form.When>
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
              disabled={!isDirty || !isValid || isSubmitting}
              loading={isSubmitting}>
              {contact ? t`Update` : t`Create`}
            </Button>
          </div>
        </>
      )}
    </Form.Root>
  );
};
