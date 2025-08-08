import { Button } from '@/components/button';
import { Form } from '@/components/form';
import { Title, Text } from '@/components/typography';
import { toast } from '@/modules/toast';
import { z } from 'zod';

const testSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .min(2, 'Name must be at least 2 characters')
    .max(20, 'Name must be at most 20 characters')
    .regex(/^[a-zA-Z\s]+$/, 'Name can only contain letters and spaces'),
  email: z.string().email('Invalid email address'),
  role: z
    .string()
    .min(1, 'Role is required')
    .refine((val) => val !== 'guest', 'Guest role is not allowed for this form'),
  bio: z.string().min(10, 'Bio must be at least 10 characters').max(200, 'Bio is too long'),
  newsletter: z.boolean().optional(),
  skills: z.array(z.string()).min(1, 'Select at least one skill'),
  experience: z.string().min(1, 'Experience level is required'),
  notifications: z.boolean().optional(),
  terms: z.boolean().refine((val) => val === true, 'You must accept the terms and conditions'),
  age: z.number().min(18, 'Must be at least 18 years old').max(100, 'Invalid age'),
  website: z.string().url('Must be a valid URL').optional().or(z.literal('')),
});

export function FormDemo() {
  const handleSubmit = async (data: z.infer<typeof testSchema>) => {
    console.log('Form submitted:', data);
    toast.success('Form submitted successfully!');
  };

  const roleOptions = [
    { label: 'Admin', value: 'admin' },
    { label: 'User', value: 'user' },
    { label: 'Guest', value: 'guest' },
  ];

  return (
    <div className="max-w-2xl space-y-6 p-6">
      <div className="space-y-2">
        <Title level={2}>React Hook Form with useController Demo</Title>
        <Text textColor="muted">
          Showcasing optimized form components with React Hook Form and useController: Input,
          Textarea, Select, Checkbox, CheckboxGroup, RadioGroup, Switch, and individual Checkbox.
          Features: onBlur validation, focus management, accessibility, and performance
          optimizations.
        </Text>
      </div>

      <Form
        schema={testSchema}
        onSubmit={handleSubmit}
        defaultValues={{
          name: '',
          email: '',
          role: '',
          bio: '',
          newsletter: false,
          skills: [],
          experience: '',
          notifications: true,
          terms: false,
          age: 18,
          website: '',
        }}
        mode="onBlur"
        reValidateMode="onChange"
        shouldFocusError={true}
        criteriaMode="all"
        delayError={500}
        className="space-y-4">
        {(form) => (
          <>
            <Form.Input
              field="name"
              label="Full Name"
              placeholder="Enter your full name"
              required
              rules={{
                minLength: { value: 2, message: 'Name must be at least 2 characters' },
                maxLength: { value: 20, message: 'Name must be at most 20 characters' },
                pattern: {
                  value: /^[a-zA-Z\s]+$/,
                  message: 'Name can only contain letters and spaces',
                },
              }}
            />

            <Form.Input
              field="email"
              label="Email Address"
              type="email"
              placeholder="Enter your email"
              required
              rules={{
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: 'Invalid email address',
                },
              }}
            />

            <Form.Input
              field="age"
              label="Age"
              type="number"
              placeholder="Enter your age"
              required
              rules={{
                min: { value: 18, message: 'Must be at least 18 years old' },
                max: { value: 100, message: 'Invalid age' },
              }}
            />

            <Form.Input
              field="website"
              label="Website (Optional)"
              type="url"
              placeholder="https://example.com"
              rules={{
                pattern: {
                  value: /^https?:\/\/.+/,
                  message: 'Must be a valid URL starting with http:// or https://',
                },
              }}
            />

            <Form.Select
              field="role"
              label="Role"
              description="Select your role in the organization"
              options={roleOptions}
              required
            />

            <Form.Textarea
              field="bio"
              label="Bio"
              description="Tell us about yourself"
              placeholder="Write a short bio about yourself..."
              required
            />

            <Form.Checkbox
              field="newsletter"
              label="Subscribe to newsletter"
              description="Receive updates about new features and announcements"
            />

            <Form.CheckboxGroup
              field="skills"
              label="Skills"
              description="Select all that apply"
              required>
              <Form.CheckboxItem value="react">React</Form.CheckboxItem>
              <Form.CheckboxItem value="typescript">TypeScript</Form.CheckboxItem>
              <Form.CheckboxItem value="nodejs">Node.js</Form.CheckboxItem>
              <Form.CheckboxItem value="python">Python</Form.CheckboxItem>
              <Form.CheckboxItem value="java">Java</Form.CheckboxItem>
              <Form.CheckboxItem value="golang">Go</Form.CheckboxItem>
            </Form.CheckboxGroup>

            <Form.RadioGroup
              field="experience"
              label="Experience Level"
              description="Select your experience level"
              required>
              <Form.Radio value="beginner">Beginner (0-2 years)</Form.Radio>
              <Form.Radio value="intermediate">Intermediate (2-5 years)</Form.Radio>
              <Form.Radio value="advanced">Advanced (5+ years)</Form.Radio>
            </Form.RadioGroup>

            <Form.Switch
              field="notifications"
              label="Enable notifications"
              description="Receive email notifications for important updates"
            />

            <Form.Checkbox
              field="terms"
              label="I accept the terms and conditions"
              description="You must accept the terms to continue"
              required
            />

            {/* Enhanced Form State Display */}
            <div className="bg-muted space-y-2 rounded-lg p-4">
              <Text className="font-semibold">Form State:</Text>
              <div className="space-y-1 text-sm">
                <div>Is Valid: {form.formState.isValid ? '✅' : '❌'}</div>
                <div>Is Dirty: {form.formState.isDirty ? '✅' : '❌'}</div>
                <div>Is Submitting: {form.formState.isSubmitting ? '✅' : '❌'}</div>
                <div>Is Validating: {form.formState.isValidating ? '✅' : '❌'}</div>
                <div>Error Count: {Object.keys(form.formState.errors).length}</div>
                <div>Touched Fields: {Object.keys(form.formState.touchedFields).length}</div>
                <div>Dirty Fields: {Object.keys(form.formState.dirtyFields).length}</div>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex gap-2 pt-4">
              <Button htmlType="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Submitting...' : 'Submit Form'}
              </Button>
              <Button
                type="secondary"
                theme="outline"
                onClick={() => form.reset()}
                disabled={form.formState.isSubmitting}>
                Reset
              </Button>
              <Button
                type="secondary"
                theme="outline"
                onClick={() => form.trigger()}
                disabled={form.formState.isSubmitting}>
                Validate All
              </Button>
            </div>
          </>
        )}
      </Form>
    </div>
  );
}
