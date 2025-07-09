import { Blockquote, Code, Link, List, ListItem, Paragraph, Text, Title } from './index';

export function TypographyExample() {
  return (
    <div className="space-y-8 p-6">
      {/* Title Examples */}
      <div className="space-y-4">
        <h2 className="mb-4 text-2xl font-bold">Title Examples</h2>
        <Title level={1}>Heading Level 1</Title>
        <Title level={2}>Heading Level 2</Title>
        <Title level={3}>Heading Level 3</Title>
        <Title level={4}>Heading Level 4</Title>
        <Title level={5}>Heading Level 5</Title>
        <Title level={6}>Heading Level 6</Title>

        <Title level={1} weight="bold">
          Bold Title
        </Title>
        <Title level={2} weight="normal">
          Normal Weight Title
        </Title>
      </div>

      {/* Text Examples */}
      <div className="space-y-4">
        <h2 className="mb-4 text-2xl font-bold">Text Examples</h2>

        <div className="space-y-2">
          <Text size="xs">Extra Small Text</Text>
          <Text size="sm">Small Text</Text>
          <Text size="base">Base Text</Text>
          <Text size="lg">Large Text</Text>
          <Text size="xl">Extra Large Text</Text>
          <Text size="2xl">2XL Text</Text>
          <Text size="3xl">3XL Text</Text>
          <Text size="4xl">4XL Text</Text>
        </div>

        <div className="space-y-2">
          <Text weight="normal">Normal Weight</Text>
          <Text weight="medium">Medium Weight</Text>
          <Text weight="semibold">Semibold Weight</Text>
          <Text weight="bold">Bold Weight</Text>
          <Text weight="extrabold">Extrabold Weight</Text>
        </div>

        <div className="space-y-2">
          <Text textColor="default">Default Color</Text>
          <Text textColor="muted">Muted Color</Text>
          <Text textColor="primary">Primary Color</Text>
          <Text textColor="secondary">Secondary Color</Text>
          <Text textColor="destructive">Destructive Color</Text>
          <Text textColor="success">Success Color</Text>
          <Text textColor="warning">Warning Color</Text>
          <Text textColor="info">Info Color</Text>
        </div>

        <div className="space-y-2">
          <Text type="default">Default Text</Text>
          <Text type="code">Code Text</Text>
          <Text type="mark">Marked Text</Text>
          <Text type="underline">Underlined Text</Text>
          <Text type="delete">Deleted Text</Text>
          <Text type="strong">Strong Text</Text>
          <Text type="italic">Italic Text</Text>
        </div>

        <div className="space-y-2">
          <Text copyable>Copyable Text</Text>
          <Text ellipsis className="max-w-xs">
            This is a very long text that will be truncated with ellipsis when it exceeds the
            container width
          </Text>
        </div>
      </div>

      {/* Paragraph Examples */}
      <div className="space-y-4">
        <h2 className="mb-4 text-2xl font-bold">Paragraph Examples</h2>

        <Paragraph>
          This is a default paragraph with normal spacing. Lorem ipsum dolor sit amet, consectetur
          adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
        </Paragraph>

        <Paragraph size="lg" spacing="loose">
          This is a large paragraph with loose spacing. Lorem ipsum dolor sit amet, consectetur
          adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
        </Paragraph>

        <Paragraph size="sm" spacing="tight">
          This is a small paragraph with tight spacing. Lorem ipsum dolor sit amet, consectetur
          adipiscing elit.
        </Paragraph>
      </div>

      {/* Link Examples */}
      <div className="space-y-4">
        <h2 className="mb-4 text-2xl font-bold">Link Examples</h2>

        <div className="space-y-2">
          <Link href="https://example.com">Default Link</Link>
          <Link href="https://example.com" target="_blank">
            External Link
          </Link>
          <Text>
            This is a paragraph with a <Link href="https://example.com">inline link</Link> inside
            it.
          </Text>
        </div>
      </div>

      {/* List Examples */}
      <div className="space-y-4">
        <h2 className="mb-4 text-2xl font-bold">List Examples</h2>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          <div>
            <h3 className="mb-2 text-lg font-semibold">Unordered List</h3>
            <List>
              <ListItem>First item</ListItem>
              <ListItem>Second item</ListItem>
              <ListItem>Third item</ListItem>
            </List>
          </div>

          <div>
            <h3 className="mb-2 text-lg font-semibold">Ordered List</h3>
            <List listType="ordered">
              <ListItem>First item</ListItem>
              <ListItem>Second item</ListItem>
              <ListItem>Third item</ListItem>
            </List>
          </div>
        </div>
      </div>

      {/* Blockquote Examples */}
      <div className="space-y-4">
        <h2 className="mb-4 text-2xl font-bold">Blockquote Examples</h2>

        <Blockquote>
          &ldquo;This is a blockquote example. It demonstrates how to use the Blockquote component
          with proper styling and typography.&rdquo;
        </Blockquote>
      </div>

      {/* Code Examples */}
      <div className="space-y-4">
        <h2 className="mb-4 text-2xl font-bold">Code Examples</h2>

        <div className="space-y-2">
          <Text>
            This is a paragraph with <Code>inline code</Code> inside it.
          </Text>

          <Code as="pre">
            {`function hello() {
  console.log("Hello, World!");
}`}
          </Code>
        </div>
      </div>

      {/* Complex Example */}
      <div className="space-y-4">
        <h2 className="mb-4 text-2xl font-bold">Complex Example</h2>

        <div className="space-y-4">
          <Title level={3}>Article Title</Title>

          <Paragraph>
            This is the introduction paragraph. It provides an overview of the content that follows.
            <Text textColor="muted" size="sm">
              {' '}
              This is a smaller, muted text within the paragraph.
            </Text>
          </Paragraph>

          <Title level={4}>Section Heading</Title>

          <Paragraph>
            This section contains more detailed information. You can use various text styles:
          </Paragraph>

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
            &ldquo;This is a quote that adds context to the article. It can be used to provide
            additional perspective or reference external sources.&rdquo;
          </Blockquote>

          <Paragraph>
            The article concludes with a final paragraph. You can include
            <Link href="https://example.com"> links</Link> and other elements as needed.
          </Paragraph>
        </div>
      </div>
    </div>
  );
}
