import React from 'react';
import Markdown from 'react-markdown';
import { Link } from 'react-router';
import remarkGfm from 'remark-gfm';

interface MarkdownRendererProps {
  content: string;
}

/**
 * Renders Markdown content from the assistant.
 *
 * - Internal portal links (relative paths starting with /) are rendered as
 *   React Router <Link> elements so navigation stays within the SPA.
 * - External URLs are rendered as <a target="_blank" rel="noopener noreferrer">.
 */
export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <Markdown
      remarkPlugins={[remarkGfm]}
      components={{
        a({ href, children, ...props }) {
          if (!href) {
            return <span {...props}>{children}</span>;
          }
          const isInternal = href.startsWith('/') && !href.startsWith('//');
          if (isInternal) {
            return (
              <Link
                to={href}
                className="text-primary underline underline-offset-2 hover:opacity-80">
                {children}
              </Link>
            );
          }
          return (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline underline-offset-2 hover:opacity-80"
              {...props}>
              {children}
            </a>
          );
        },
        // Ensure code blocks render nicely
        code({ children, className, ...props }) {
          const isBlock = className?.includes('language-');
          if (isBlock) {
            return (
              <code className="bg-muted block overflow-x-auto rounded p-3 text-sm" {...props}>
                {children}
              </code>
            );
          }
          return (
            <code className="bg-muted rounded px-1 py-0.5 font-mono text-sm" {...props}>
              {children}
            </code>
          );
        },
        p({ children }) {
          return <p className="mb-2 last:mb-0">{children}</p>;
        },
        ul({ children }) {
          return <ul className="mb-2 list-disc pl-4">{children}</ul>;
        },
        ol({ children }) {
          return <ol className="mb-2 list-decimal pl-4">{children}</ol>;
        },
        li({ children }) {
          return <li className="mb-0.5">{children}</li>;
        },
        strong({ children }) {
          return <strong className="font-semibold">{children}</strong>;
        },
        h1({ children }) {
          return <h1 className="mb-2 text-base font-semibold">{children}</h1>;
        },
        h2({ children }) {
          return <h2 className="mb-1.5 text-sm font-semibold">{children}</h2>;
        },
        h3({ children }) {
          return <h3 className="mb-1 text-sm font-medium">{children}</h3>;
        },
        table({ children }) {
          return (
            <div className="mb-3 overflow-x-auto rounded-md border">
              <table className="w-full border-collapse text-sm">{children}</table>
            </div>
          );
        },
        thead({ children }) {
          return <thead className="bg-muted/60">{children}</thead>;
        },
        tbody({ children }) {
          return <tbody className="divide-y">{children}</tbody>;
        },
        tr({ children }) {
          return <tr className="hover:bg-muted/40 transition-colors">{children}</tr>;
        },
        th({ children }) {
          return (
            <th className="border-border border-b px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide">
              {children}
            </th>
          );
        },
        td({ children }) {
          return <td className="px-3 py-2 align-top">{children}</td>;
        },
      }}>
      {content}
    </Markdown>
  );
}
