import { CodeEditorProps } from './code-editor.types';
import { cn } from '@/modules/shadcn/lib/utils';
import Editor, { Monaco } from '@monaco-editor/react';
import { editor } from 'monaco-editor';
import { useRef } from 'react';
import { useTheme, Theme } from 'remix-themes';

export const CodeEditor = ({
  value = '',
  onChange,
  language = 'yaml',
  id,
  name,
  error,
  className,
  readOnly = false,
  minHeight = '200px',
}: CodeEditorProps) => {
  const [theme] = useTheme();
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

  // Handle editor mounting
  const handleEditorDidMount = (editor: editor.IStandaloneCodeEditor, monaco: Monaco) => {
    editorRef.current = editor;

    // Set up customizations
    editor.updateOptions({
      tabSize: 2,
      minimap: { enabled: false }, // Disable minimap for cleaner UI
      scrollBeyondLastLine: false,
      folding: true,
      lineNumbers: 'on',
      renderLineHighlight: 'all',
      scrollbar: {
        vertical: 'auto',
        horizontal: 'auto',
      },
      readOnly,
      automaticLayout: true, // Important for responsive resizing
    });

    // Configure JSON schemas if needed
    if (language === 'json') {
      monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
        validate: true,
        allowComments: false,
        schemas: [],
      });
    }

    // Format the content on first load
    setTimeout(() => {
      editor.getAction('editor.action.formatDocument')?.run();
    }, 300);
  };

  return (
    <>
      <div
        className={cn(
          'overflow-hidden rounded-md border',
          error ? 'border-destructive' : 'border-input',
          readOnly ? 'opacity-80' : '',
          className
        )}
        style={{ height: minHeight }}>
        <Editor
          value={value}
          language={language}
          theme={theme === Theme.DARK ? 'vs-dark' : 'light'}
          options={{
            readOnly,
            automaticLayout: true,
            lineNumbers: 'on',
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            tabSize: 2,
            wordWrap: 'on',
          }}
          onChange={(newValue) => onChange?.(newValue || '')}
          onMount={handleEditorDidMount}
          height="100%"
          width="100%"
          className="monaco-editor-container"
          loading={<div className="text-muted p-4">Loading editor...</div>}
        />
      </div>

      {/* Hidden field to capture the current value */}
      <input
        type="hidden"
        name={name}
        value={value}
        defaultValue={value}
        id={id}
        onChange={() => undefined}
      />
    </>
  );
};
