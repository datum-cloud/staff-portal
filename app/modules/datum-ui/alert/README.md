# Alert Component

A simple and flexible alert component for displaying important messages to users. Built with class-variance-authority for type-safe styling and full dark mode support.

## Features

- **Multiple Variants**: default, destructive, warning, success, info
- **Size Options**: small, default, large
- **Icon Support**: Automatic icons per variant with custom icon option
- **Accessibility**: Proper ARIA attributes and semantic HTML
- **Dark Mode**: Full dark mode support for all variants
- **Simple API**: One component with all the features you need

## Usage

```tsx
import { Alert } from '@datum-ui/alert';

// Basic usage
<Alert variant="warning" title="Warning" description="This action cannot be undone." />

// With custom icon
<Alert variant="success" title="Success!" description="Your changes have been saved." icon={<CustomIcon />} />

// Without icon
<Alert variant="info" title="Information" description="Here's some helpful information." showIcon={false} />

// Custom content
<Alert variant="destructive" title="Error">
  <p>Something went wrong. Please try again.</p>
  <button>Retry</button>
</Alert>
```

## Props

| Prop          | Type                                                             | Default     | Description            |
| ------------- | ---------------------------------------------------------------- | ----------- | ---------------------- |
| `variant`     | `'default' \| 'destructive' \| 'warning' \| 'success' \| 'info'` | `'default'` | Alert variant/type     |
| `size`        | `'sm' \| 'default' \| 'lg'`                                      | `'default'` | Alert size             |
| `title`       | `string`                                                         | -           | Alert title            |
| `description` | `string`                                                         | -           | Alert description      |
| `showIcon`    | `boolean`                                                        | `true`      | Show/hide icon         |
| `icon`        | `React.ReactNode`                                                | -           | Custom icon            |
| `className`   | `string`                                                         | -           | Additional CSS classes |

## Variants

### Default

Standard informational alert.

```tsx
<Alert title="Information" description="This is general information." />
```

### Destructive

For errors and dangerous actions.

```tsx
<Alert variant="destructive" title="Error" description="Something went wrong. Please try again." />
```

### Warning

For cautionary messages.

```tsx
<Alert variant="warning" title="Warning" description="This action cannot be undone." />
```

### Success

For positive feedback and confirmations.

```tsx
<Alert variant="success" title="Success" description="Your changes have been saved." />
```

### Info

For informational messages.

```tsx
<Alert variant="info" title="Info" description="Here's some helpful information." />
```

## Sizes

### Small

Compact alert for tight spaces.

```tsx
<Alert variant="warning" size="sm" title="Small Alert" description="Compact message." />
```

### Default

Standard alert size.

```tsx
<Alert variant="success" title="Default Alert" description="Standard sized message." />
```

### Large

Prominent alert for important messages.

```tsx
<Alert
  variant="destructive"
  size="lg"
  title="Large Alert"
  description="Important message that needs attention."
/>
```

## Examples

### Basic Alerts

```tsx
import { Alert } from '@datum-ui/alert';

function BasicAlerts() {
  return (
    <div className="space-y-4">
      <Alert title="Information" description="This is a default alert." />
      <Alert variant="success" title="Success" description="Operation completed successfully." />
      <Alert variant="warning" title="Warning" description="Please review your changes." />
      <Alert
        variant="destructive"
        title="Error"
        description="An error occurred while processing."
      />
    </div>
  );
}
```

### Custom Icons

```tsx
import { Alert } from '@datum-ui/alert';
import { Star, Heart } from 'lucide-react';

function CustomIconAlerts() {
  return (
    <div className="space-y-4">
      <Alert
        variant="success"
        title="Custom Icon"
        description="This alert uses a custom star icon."
        icon={<Star className="h-4 w-4" />}
      />
      <Alert
        variant="warning"
        title="Another Custom Icon"
        description="This alert uses a heart icon."
        icon={<Heart className="h-4 w-4" />}
      />
    </div>
  );
}
```

### Custom Content

```tsx
import { Alert } from '@datum-ui/alert';
import { Button } from '@datum-ui/button';

function CustomContentAlert() {
  return (
    <Alert variant="info" title="Custom Content">
      <div className="flex items-center justify-between">
        <span>This alert has custom content with actions.</span>
        <div className="flex gap-2">
          <Button size="sm" type="secondary">
            Cancel
          </Button>
          <Button size="sm" type="primary">
            Confirm
          </Button>
        </div>
      </div>
    </Alert>
  );
}
```

### Form Validation Alerts

```tsx
import { Alert } from '@datum-ui/alert';

function FormValidationAlerts() {
  const [errors, setErrors] = useState<string[]>([]);

  return (
    <div className="space-y-4">
      {errors.length > 0 && (
        <Alert variant="destructive" title="Validation Errors">
          <ul className="list-inside list-disc space-y-1">
            {errors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </Alert>
      )}

      <Alert variant="info" title="Form Tips">
        Make sure to fill in all required fields marked with an asterisk (*).
      </Alert>
    </div>
  );
}
```

## Styling

The alert component uses Tailwind CSS classes and supports:

- **Custom Classes**: Add additional classes via the `className` prop
- **Dark Mode**: Automatic dark mode support for all variants
- **Responsive**: Responsive design built-in
- **Accessibility**: Proper focus states and ARIA attributes

### Custom Styling

```tsx
<Alert
  variant="warning"
  className="border-2 border-yellow-400 bg-yellow-50 shadow-lg"
  title="Custom Styled Alert"
  description="This alert has custom styling applied."
/>
```

## Accessibility

The alert component includes:

- Proper ARIA attributes (`role="alert"`)
- Semantic HTML structure
- Screen reader compatibility
- Keyboard navigation support
- Focus management

## Dependencies

- `class-variance-authority`: For type-safe variant styling
- `lucide-react`: For default icons
- `@/modules/shadcn/lib/utils`: For class name utilities

## Best Practices

### 1. Use Appropriate Variants

- `default`: General information
- `info`: Helpful information
- `success`: Positive feedback
- `warning`: Cautionary messages
- `destructive`: Errors and dangerous actions

### 2. Keep Content Concise

- Use clear, actionable titles
- Keep descriptions brief and to the point
- Avoid overwhelming users with too much text

### 3. Consider Context

- Use alerts sparingly for truly important messages
- Consider the user's current task and context
- Provide clear next steps when appropriate

### 4. Accessibility

- Ensure sufficient color contrast
- Use descriptive titles and descriptions
- Test with screen readers
- Provide alternative ways to access information
