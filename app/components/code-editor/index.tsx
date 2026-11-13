import type { CodeEditor as DatumCodeEditor } from '@datum-cloud/datum-ui/code-editor';
import { Skeleton } from '@datum-cloud/datum-ui/skeleton';
import { ClientOnly } from '@datum-cloud/datum-ui/theme';
import { lazy, Suspense, type ComponentProps } from 'react';

export type { EditorLanguage } from '@datum-cloud/datum-ui/code-editor';

type CodeEditorProps = ComponentProps<typeof DatumCodeEditor>;

// Monaco only runs in the browser, and on the server its package loads in a
// form where the editor import is an object, not a component (#830). Loading
// the editor lazily keeps Monaco out of the server render and the main bundle.
const LazyCodeEditor = lazy(() =>
  import('@datum-cloud/datum-ui/code-editor').then((module) => ({ default: module.CodeEditor }))
);

/**
 * datum-ui's `CodeEditor`, rendered only in the browser. The server and the
 * first browser render show a placeholder of the same height, then Monaco
 * loads. Use this instead of importing `CodeEditor` directly.
 */
export function CodeEditor(props: CodeEditorProps) {
  const placeholder = (
    <Skeleton className="w-full rounded-md" style={{ height: props.minHeight ?? '200px' }} />
  );

  return (
    <ClientOnly fallback={placeholder}>
      <Suspense fallback={placeholder}>
        <LazyCodeEditor {...props} />
      </Suspense>
    </ClientOnly>
  );
}
