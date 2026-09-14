import { DemoGroup, DemoSection, type DemoSectionMeta } from './demo-section';
import { SectionCard } from '@/features/milo';
import { Button } from '@datum-cloud/datum-ui/button';
import { Form } from '@datum-cloud/datum-ui/form';
import { toast } from '@datum-cloud/datum-ui/toast';
import { z } from 'zod';

export const formDemoSections: DemoSectionMeta[] = [{ id: 'form', label: 'Form' }];

const testSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  role: z.enum(['admin', 'user', 'guest']),
  bio: z.string().min(10, 'Bio must be at least 10 characters'),
  notifications: z.boolean().optional(),
});

export default function FormDemo() {
  const handleSubmit = async (_data: z.infer<typeof testSchema>) => {
    toast.success('Form submitted successfully!');
  };

  return (
    <DemoGroup title="Forms" description="datum-ui schema-driven Form with inline validation.">
      <DemoSection
        id="form"
        title="Form"
        description="Zod schema + Form.Field controls; submit is gated on dirty & valid."
        bare>
        <SectionCard className="max-w-2xl">
          <Form.Root
            schema={testSchema}
            onSubmit={handleSubmit}
            defaultValues={{
              name: '',
              email: '',
              role: 'user',
              bio: '',
              notifications: true,
            }}
            className="space-y-4">
            {({ isDirty, isSubmitting, isValid, reset }) => (
              <>
                <Form.Field name="name" label="Full Name" required>
                  <Form.Input placeholder="Enter your full name" />
                </Form.Field>
                <Form.Field name="email" label="Email Address" required>
                  <Form.Input type="email" placeholder="Enter your email" />
                </Form.Field>
                <Form.Field name="role" label="Role" required>
                  <Form.Select>
                    <Form.SelectItem value="admin">Admin</Form.SelectItem>
                    <Form.SelectItem value="user">User</Form.SelectItem>
                    <Form.SelectItem value="guest">Guest</Form.SelectItem>
                  </Form.Select>
                </Form.Field>
                <Form.Field name="bio" label="Bio" required>
                  <Form.Textarea placeholder="Write a short bio about yourself..." />
                </Form.Field>
                <Form.Field name="notifications">
                  <Form.Switch label="Enable notifications" />
                </Form.Field>

                <div className="flex gap-2 pt-2">
                  <Button htmlType="submit" disabled={!isDirty || !isValid || isSubmitting}>
                    Submit
                  </Button>
                  <Button type="secondary" theme="outline" htmlType="button" onClick={reset}>
                    Reset
                  </Button>
                </div>
              </>
            )}
          </Form.Root>
        </SectionCard>
      </DemoSection>
    </DemoGroup>
  );
}
