import type { Route } from './+types/index';
import { AssistantWorkspace, STAFF_ASSISTANT_CONFIG } from '@/features/assistant-workspace';
import { HEADER_STACK_H } from '@/features/milo/lib/dimensions';
import { useEnv } from '@/hooks';
import { useApp } from '@/providers/app.provider';
import { metaObject } from '@/utils/helpers';
import { Trans } from '@lingui/react/macro';

export const meta: Route.MetaFunction = () => {
  return metaObject('Assistant');
};

export const handle = {
  breadcrumb: () => <Trans>Assistant</Trans>,
};

export default function Page() {
  const env = useEnv();
  const { user } = useApp();

  if (!env?.CHATBOT_ENABLED) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <p className="text-muted-foreground text-sm">The AI assistant is not enabled.</p>
      </div>
    );
  }

  // The route (the mount) owns the sizing; the workspace fills its container so
  // it's equally at home here or in a slide-out panel.
  return (
    <div className="w-full" style={{ height: `calc(100svh - ${HEADER_STACK_H}px)` }}>
      <AssistantWorkspace config={STAFF_ASSISTANT_CONFIG} userName={user?.spec?.givenName} />
    </div>
  );
}
