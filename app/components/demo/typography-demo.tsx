import { DemoGroup, DemoSection, type DemoSectionMeta } from './demo-section';
import {
  Blockquote,
  Code,
  Link,
  List,
  ListItem,
  Paragraph,
  Text,
  Title,
} from '@datum-cloud/datum-ui/typography';
import { useEffect, useRef, useState } from 'react';

export const typographyDemoSections: DemoSectionMeta[] = [
  { id: 'type-titles', label: 'Titles' },
  { id: 'type-tailwind', label: 'Tailwind sizes' },
  { id: 'type-weights', label: 'Weights & colors' },
  { id: 'type-inline', label: 'Inline' },
  { id: 'type-blocks', label: 'Paragraph & blocks' },
];

// Raw Tailwind font-size utilities — driven by the theme's `--text-*` tokens.
// The px/line-height readout makes any change to that scale visible here.
const TAILWIND_SIZES = [
  'text-xs',
  'text-sm',
  'text-base',
  'text-lg',
  'text-xl',
  'text-2xl',
  'text-3xl',
  'text-4xl',
  'text-5xl',
] as const;

/**
 * Reports an element's computed `font-size / line-height` — read live from the
 * DOM (post-cascade, so it reflects any theme override), re-measured on resize
 * because some scales (e.g. Title levels) are responsive at breakpoints.
 */
function useTypeMetrics<T extends HTMLElement>(measureChild = false) {
  const ref = useRef<T>(null);
  const [metrics, setMetrics] = useState('');

  useEffect(() => {
    const measure = () => {
      const host = ref.current;
      const target = measureChild ? host?.firstElementChild : host;
      if (!target) return;
      const { fontSize, lineHeight } = getComputedStyle(target);
      setMetrics(`${fontSize} / ${lineHeight}`);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [measureChild]);

  return { ref, metrics };
}

/** Muted mono readout of computed type metrics. */
function Metrics({ children }: { children: React.ReactNode }) {
  return (
    <Text size="xs" textColor="muted" className="w-28 shrink-0 font-mono">
      {children}
    </Text>
  );
}

/** Renders one `text-*` utility and reports its computed size. */
function TailwindSizeRow({ cls }: { cls: string }) {
  const { ref, metrics } = useTypeMetrics<HTMLSpanElement>();
  return (
    <div className="flex items-baseline gap-4">
      <Text size="xs" textColor="muted" className="w-24 shrink-0 font-mono">
        {cls}
      </Text>
      <Metrics>{metrics}</Metrics>
      <span ref={ref} className={cls}>
        The quick brown fox
      </span>
    </div>
  );
}

/** Renders one Title level and reports the heading's computed size (responsive). */
function TitleRow({ level }: { level: (typeof TITLE_LEVELS)[number] }) {
  const { ref, metrics } = useTypeMetrics<HTMLDivElement>(true);
  return (
    <div className="flex items-baseline gap-4">
      <Text
        size="xs"
        textColor="muted"
        className="w-24 shrink-0 font-mono">{`level ${level}`}</Text>
      <Metrics>{metrics}</Metrics>
      <div ref={ref} className="min-w-0">
        <Title level={level}>The quick brown fox</Title>
      </div>
    </div>
  );
}

const TITLE_LEVELS = [1, 2, 3, 4, 5, 6] as const;
const WEIGHTS = ['normal', 'medium', 'semibold', 'bold', 'extrabold'] as const;
const COLORS = [
  'default',
  'secondary',
  'muted',
  'primary',
  'success',
  'info',
  'warning',
  'destructive',
] as const;

/** Left-aligned muted label so specimens read as a reference table. */
function Spec({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-4">
      <Text size="xs" textColor="muted" className="w-20 shrink-0 font-mono">
        {label}
      </Text>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export default function TypographyDemo() {
  return (
    <DemoGroup
      title="Typography"
      description="datum-ui typography — the Title / Text scale plus inline and rich elements.">
      <DemoSection
        id="type-titles"
        title="Titles"
        description="Semantic heading scale (Title level 1–6) with computed font-size / line-height. Levels are responsive — resize the window to see them change at breakpoints.">
        <div className="space-y-3">
          {TITLE_LEVELS.map((level) => (
            <TitleRow key={level} level={level} />
          ))}
          <Spec label="font-title">
            <Title level={2} className="font-title">
              Canela display face
            </Title>
          </Spec>
        </div>
      </DemoSection>

      <DemoSection
        id="type-tailwind"
        title="Tailwind sizes"
        description="Raw text-* utilities (driven by the theme's --text-* tokens), with computed font-size / line-height.">
        <div className="space-y-3">
          {TAILWIND_SIZES.map((cls) => (
            <TailwindSizeRow key={cls} cls={cls} />
          ))}
        </div>
      </DemoSection>

      <DemoSection
        id="type-weights"
        title="Weights & colors"
        description="Font weights and semantic text colors.">
        <div className="space-y-3">
          {WEIGHTS.map((weight) => (
            <Spec key={weight} label={weight}>
              <Text size="lg" weight={weight}>
                The quick brown fox
              </Text>
            </Spec>
          ))}
          <div className="flex flex-wrap gap-x-6 gap-y-2 pt-2">
            {COLORS.map((textColor) => (
              <Text key={textColor} textColor={textColor} weight="medium">
                {textColor}
              </Text>
            ))}
          </div>
        </div>
      </DemoSection>

      <DemoSection
        id="type-inline"
        title="Inline"
        description="Inline text types plus inline Code and Link.">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <Text type="strong">strong</Text>
            <Text type="italic">italic</Text>
            <Text type="underline">underline</Text>
            <Text type="delete">deleted</Text>
            <Text type="mark">highlighted</Text>
            <Text type="code">inline code</Text>
          </div>

          <Text>
            A line with an inline <Code>token</Code> and a <Link href="#type-inline">Link</Link>,
            plus an external{' '}
            <Link href="https://datum.net" target="_blank">
              link
            </Link>
            .
          </Text>
        </div>
      </DemoSection>

      <DemoSection
        id="type-blocks"
        title="Paragraph & blocks"
        description="Paragraph (with spacing), ordered / unordered lists, a code block, and Blockquote.">
        <div className="space-y-6">
          <div className="space-y-3">
            {(['tight', 'normal', 'loose'] as const).map((spacing) => (
              <Spec key={spacing} label={spacing}>
                <Paragraph spacing={spacing} className="max-w-prose">
                  Datum Cloud is a network cloud that connects your services across providers and
                  regions. This paragraph shows the {spacing} line spacing.
                </Paragraph>
              </Spec>
            ))}
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <Text size="xs" textColor="muted" className="font-mono">
                unordered
              </Text>
              <List>
                <ListItem>First item</ListItem>
                <ListItem>Second item</ListItem>
                <ListItem>Third item</ListItem>
              </List>
            </div>
            <div className="space-y-2">
              <Text size="xs" textColor="muted" className="font-mono">
                ordered
              </Text>
              <List listType="ordered" as="ol">
                <ListItem>First step</ListItem>
                <ListItem>Second step</ListItem>
                <ListItem>Third step</ListItem>
              </List>
            </div>
          </div>

          <Code as="pre">{`export function greet(name: string) {
  return \`Hello, \${name}\`;
}`}</Code>

          <Blockquote>
            &ldquo;Design is not just what it looks like and feels like. Design is how it
            works.&rdquo;
          </Blockquote>
        </div>
      </DemoSection>
    </DemoGroup>
  );
}
