import { useTheme } from '@/modules/datum-themes';
import { cn } from '@/modules/shadcn/lib/utils';
import DiffEditor from '@monaco-editor/react';
import { useRef } from 'react';

export interface CodeEditorDiffProps {
  original: any;
  modified: any;
  originalLabel?: string;
  modifiedLabel?: string;
  minHeight?: string;
  readOnly?: boolean;
  className?: string;
}

/**
 * Formats an object or value as JSON with 2-space indentation
 */
function formatJson(value: any): string {
  if (value === null || value === undefined) {
    return '{}';
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return '{}';
  }
}

/**
 * A diff editor component that shows side-by-side comparison of two JSON objects
 * Uses Monaco's built-in DiffEditor for professional diff visualization
 */
export const CodeEditorDiff = ({
  original,
  modified,
  originalLabel = 'Previous',
  modifiedLabel = 'Current',
  minHeight = '400px',
  readOnly = true,
  className,
}: CodeEditorDiffProps) => {
  const { resolvedTheme } = useTheme();
  const editorRef = useRef<any>(null);

  const originalValue = formatJson(original);
  const modifiedValue = formatJson(modified);

  return (
    <div
      className={cn('border-input overflow-hidden rounded-md border', className)}
      style={{ height: minHeight }}>
      <DiffEditor
        original={originalValue}
        modified={modifiedValue}
        language="json"
        theme={resolvedTheme === 'dark' ? 'vs-dark' : 'light'}
        options={{
          readOnly,
          automaticLayout: true,
          lineNumbers: 'on',
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          tabSize: 2,
          wordWrap: 'on',
          renderSideBySide: true,
          originalEditable: false,
          ignoreCharChanges: false,
        }}
        onMount={(editor) => {
          editorRef.current = editor;
          // Format both editors on mount
          setTimeout(() => {
            try {
              editor?.getOriginalEditor()?.getAction('editor.action.formatDocument')?.run();
              editor?.getModifiedEditor()?.getAction('editor.action.formatDocument')?.run();
            } catch {
              // Ignore formatting errors
            }
          }, 300);
        }}
        height="100%"
        width="100%"
        loading={<div className="text-muted p-4">Loading editor...</div>}
      />
      {/* Labels for the editors */}
      <div className="text-muted-foreground pointer-events-none absolute top-0 right-0 left-0 z-10 flex px-2 py-1 text-xs font-medium">
        <div className="flex-1">{originalLabel}</div>
        <div className="flex-1">{modifiedLabel}</div>
      </div>
    </div>
  );
};
