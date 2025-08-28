# Typography Components

A comprehensive set of typography components built with React and Tailwind CSS, designed to provide consistent text styling across your application.

## Overview

This typography system includes components for headings, text, paragraphs, links, lists, blockquotes, and code blocks. All components are built with accessibility in mind and support dark mode out of the box.

## Components

### Title

Used for headings and titles with semantic HTML structure.

```tsx
import { Title } from './typography';

<Title level={1}>Main Heading</Title>
<Title level={2} weight="bold">Section Title</Title>
<Title level={3} textColor="primary">Subsection</Title>
```

#### Props

| Prop        | Type                                                                                                    | Default      | Description            |
| ----------- | ------------------------------------------------------------------------------------------------------- | ------------ | ---------------------- |
| `level`     | `1 \| 2 \| 3 \| 4 \| 5 \| 6`                                                                            | `4`          | Heading level (h1-h6)  |
| `weight`    | `'normal' \| 'medium' \| 'semibold' \| 'bold' \| 'extrabold'`                                           | `'semibold'` | Font weight            |
| `textColor` | `'default' \| 'muted' \| 'primary' \| 'secondary' \| 'destructive' \| 'success' \| 'warning' \| 'info'` | `'default'`  | Text color variant     |
| `as`        | `'h1' \| 'h2' \| 'h3' \| 'h4' \| 'h5' \| 'h6'`                                                          | `h${level}`  | HTML element to render |
| `className` | `string`                                                                                                | -            | Additional CSS classes |

### Text

Versatile text component for inline and block text with various styling options.

```tsx
import { Text } from './typography';

<Text size="lg" weight="semibold">Large Semibold Text</Text>
<Text textColor="muted" type="code">Code Text</Text>
<Text copyable>Copyable Text</Text>
<Text ellipsis className="max-w-xs">Long text that gets truncated...</Text>
```

#### Props

| Prop        | Type                                                                                                    | Default     | Description                  |
| ----------- | ------------------------------------------------------------------------------------------------------- | ----------- | ---------------------------- |
| `size`      | `'xs' \| 'sm' \| 'base' \| 'lg' \| 'xl' \| '2xl' \| '3xl' \| '4xl'`                                     | `'base'`    | Text size                    |
| `weight`    | `'normal' \| 'medium' \| 'semibold' \| 'bold' \| 'extrabold'`                                           | `'normal'`  | Font weight                  |
| `textColor` | `'default' \| 'muted' \| 'primary' \| 'secondary' \| 'destructive' \| 'success' \| 'warning' \| 'info'` | `'default'` | Text color variant           |
| `type`      | `'default' \| 'code' \| 'mark' \| 'underline' \| 'delete' \| 'strong' \| 'italic'`                      | `'default'` | Text style variant           |
| `as`        | `'span' \| 'p' \| 'div'`                                                                                | `'span'`    | HTML element to render       |
| `copyable`  | `boolean`                                                                                               | `false`     | Adds copy button             |
| `ellipsis`  | `boolean`                                                                                               | `false`     | Truncates text with ellipsis |
| `className` | `string`                                                                                                | -           | Additional CSS classes       |

#### Legacy Props (Deprecated)

For backward compatibility, these props are still supported but should use the `type` prop instead:

- `mark` → `type="mark"`
- `underline` → `type="underline"`
- `delete` → `type="delete"`
- `strong` → `type="strong"`
- `italic` → `type="italic"`
- `code` → `type="code"`

### Paragraph

Specialized component for paragraph text with spacing controls.

```tsx
import { Paragraph } from './typography';

<Paragraph>Default paragraph with normal spacing.</Paragraph>
<Paragraph size="lg" spacing="loose">Large paragraph with loose spacing.</Paragraph>
<Paragraph size="sm" spacing="tight">Small paragraph with tight spacing.</Paragraph>
```

#### Props

| Prop        | Type                                     | Default    | Description            |
| ----------- | ---------------------------------------- | ---------- | ---------------------- |
| `size`      | `'xs' \| 'sm' \| 'base' \| 'lg' \| 'xl'` | `'base'`   | Text size              |
| `spacing`   | `'tight' \| 'normal' \| 'loose'`         | `'normal'` | Line spacing           |
| `as`        | `'p' \| 'div'`                           | `'p'`      | HTML element to render |
| `className` | `string`                                 | -          | Additional CSS classes |

### Link

Accessible link component with proper security attributes.

```tsx
import { Link } from './typography';

<Link href="https://example.com">Default Link</Link>
<Link href="https://example.com" target="_blank">External Link</Link>
<Text>This is a paragraph with a <Link href="https://example.com">inline link</Link> inside it.</Text>
```

#### Props

| Prop        | Type                                         | Default                                | Description             |
| ----------- | -------------------------------------------- | -------------------------------------- | ----------------------- |
| `href`      | `string`                                     | -                                      | **Required** - Link URL |
| `target`    | `'_blank' \| '_self' \| '_parent' \| '_top'` | `'_self'`                              | Link target             |
| `rel`       | `string`                                     | `'noopener noreferrer'` (for `_blank`) | Link relationship       |
| `className` | `string`                                     | -                                      | Additional CSS classes  |

### List & ListItem

Components for creating ordered and unordered lists.

```tsx
import { List, ListItem } from './typography';

{
  /* Unordered List */
}
<List>
  <ListItem>First item</ListItem>
  <ListItem>Second item</ListItem>
  <ListItem>Third item</ListItem>
</List>;

{
  /* Ordered List */
}
<List listType="ordered">
  <ListItem>First item</ListItem>
  <ListItem>Second item</ListItem>
  <ListItem>Third item</ListItem>
</List>;
```

#### List Props

| Prop        | Type                       | Default             | Description            |
| ----------- | -------------------------- | ------------------- | ---------------------- |
| `listType`  | `'ordered' \| 'unordered'` | `'unordered'`       | List type              |
| `as`        | `'ol' \| 'ul'`             | Based on `listType` | HTML element to render |
| `className` | `string`                   | -                   | Additional CSS classes |

#### ListItem Props

| Prop        | Type     | Default | Description            |
| ----------- | -------- | ------- | ---------------------- |
| `className` | `string` | -       | Additional CSS classes |

### Blockquote

Component for displaying quoted text.

```tsx
import { Blockquote } from './typography';

<Blockquote>
  "This is a blockquote example. It demonstrates how to use the Blockquote component with proper
  styling and typography."
</Blockquote>;
```

#### Props

| Prop        | Type     | Default | Description            |
| ----------- | -------- | ------- | ---------------------- |
| `className` | `string` | -       | Additional CSS classes |

### Code

Component for displaying inline code and code blocks.

```tsx
import { Code } from './typography';

{
  /* Inline Code */
}
<Text>
  This is a paragraph with <Code>inline code</Code> inside it.
</Text>;

{
  /* Code Block */
}
<Code as="pre">
  {`function hello() {
  console.log("Hello, World!");
}`}
</Code>;
```

#### Props

| Prop        | Type              | Default  | Description            |
| ----------- | ----------------- | -------- | ---------------------- |
| `as`        | `'code' \| 'pre'` | `'code'` | HTML element to render |
| `className` | `string`          | -        | Additional CSS classes |

## Color Variants

All text components support the following color variants:

- `default` - Default text color
- `muted` - Muted text color
- `primary` - Primary brand color
- `secondary` - Secondary text color
- `destructive` - Error/danger color
- `success` - Success color
- `warning` - Warning color
- `info` - Information color

## Usage Examples

### Basic Typography Hierarchy

```tsx
import { Title, Paragraph, Text } from './typography';

<div className="space-y-6">
  <Title level={1}>Page Title</Title>

  <Title level={2}>Section Heading</Title>
  <Paragraph>
    This is the main content section. It contains important information that users need to read and
    understand.
  </Paragraph>

  <Title level={3}>Subsection</Title>
  <Paragraph>
    This subsection provides additional details and context for the main content above.
  </Paragraph>

  <Text size="sm" textColor="muted">
    Last updated: January 2024
  </Text>
</div>;
```

### Rich Text Content

```tsx
import { Title, Paragraph, Text, List, ListItem, Blockquote, Code } from './typography';

<div className="space-y-6">
  <Title level={2}>Article Title</Title>

  <Paragraph>
    This is the introduction paragraph. It provides an overview of the content that follows.
    <Text textColor="muted" size="sm">
      {' '}
      This is a smaller, muted text within the paragraph.
    </Text>
  </Paragraph>

  <Title level={3}>Key Features</Title>

  <List>
    <ListItem>
      <Text type="strong">Bold text</Text> for emphasis
    </ListItem>
    <ListItem>
      <Text type="code">Code snippets</Text> for technical content
    </ListItem>
    <ListItem>
      <Text type="mark">Highlighted text</Text> for important information
    </ListItem>
  </List>

  <Blockquote>
    "This is a quote that adds context to the article. It can be used to provide additional
    perspective or reference external sources."
  </Blockquote>

  <Title level={3}>Code Example</Title>
  <Code as="pre">
    {`function greetUser(name) {
  return \`Hello, \${name}!\`;
}

console.log(greetUser('World'));`}
  </Code>
</div>;
```

### Interactive Elements

```tsx
import { Text, Link } from './typography';

<div className="space-y-4">
  <Text copyable>This text can be copied with one click</Text>

  <Text ellipsis className="max-w-xs">
    This is a very long text that will be truncated with ellipsis when it exceeds the container
    width
  </Text>

  <Text>
    Visit our{' '}
    <Link href="https://example.com" target="_blank">
      documentation
    </Link>{' '}
    for more information.
  </Text>
</div>;
```

## Best Practices

### 1. Semantic HTML

- Use appropriate heading levels (`level={1}` for main title, `level={2}` for sections, etc.)
- Let the `Title` component automatically generate the correct HTML element

### 2. Accessibility

- Ensure proper heading hierarchy (don't skip levels)
- Use descriptive link text
- Provide alt text for images within text content

### 3. Responsive Design

- All components are responsive by default
- Text sizes scale appropriately on different screen sizes
- Use the `className` prop for additional responsive utilities

### 4. Color Usage

- Use `muted` color for secondary information
- Use semantic colors (`success`, `warning`, `destructive`) appropriately
- Ensure sufficient color contrast for accessibility

### 5. Performance

- The `copyable` feature only works with string children
- Use `ellipsis` sparingly and provide full text via tooltip or expand functionality

## Styling Customization

All components use Tailwind CSS classes and can be customized using the `className` prop:

```tsx
<Title level={1} className="text-blue-600 transition-colors hover:text-blue-800">
  Custom Styled Title
</Title>
```

## Dark Mode Support

All components automatically support dark mode through Tailwind CSS classes. The color variants will automatically adjust their appearance based on the current theme.

## TypeScript Support

All components are fully typed with TypeScript and include proper prop interfaces. The components extend standard HTML element props where appropriate.
