import { useApp } from '@/providers/app.provider';
import { userUpdateMutation } from '@/resources/request/client';
import { Button } from '@datum-cloud/datum-ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@datum-cloud/datum-ui/card';
import { Form } from '@datum-cloud/datum-ui/form';
import { toast } from '@datum-cloud/datum-ui/toast';
import { Trans, useLingui } from '@lingui/react/macro';
import z from 'zod';

export function ProfileForm() {
  const { user, setUser } = useApp();
  const { t } = useLingui();

  const userSchema = z.object({
    first_name: z.string().nonempty(t`First name is required`),
    last_name: z.string().nonempty(t`Last name is required`),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <Trans>Profile Information</Trans>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form.Root
          className="space-y-4"
          schema={userSchema}
          defaultValues={{
            first_name: user?.spec?.givenName ?? '',
            last_name: user?.spec?.familyName ?? '',
          }}
          onSubmit={async (value: z.infer<typeof userSchema>) => {
            const updatedUser = await userUpdateMutation(user?.metadata?.name || '', {
              familyName: value.last_name,
              givenName: value.first_name,
            });

            // update user in store
            setUser(updatedUser);
            toast.success(t`Profile updated successfully`);
          }}>
          {({ isSubmitting, isDirty, isValid }) => (
            <>
              <Form.Field name="first_name" label={t`First Name`} required>
                <Form.Input />
              </Form.Field>
              <Form.Field name="last_name" label={t`Last Name`} required>
                <Form.Input />
              </Form.Field>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  htmlType="submit"
                  loading={isSubmitting}
                  disabled={!isDirty || !isValid || isSubmitting}>
                  <Trans>Save</Trans>
                </Button>
              </div>
            </>
          )}
        </Form.Root>
      </CardContent>
    </Card>
  );
}
