import type { Route } from './+types/knowledge-base';
import AppActionBar from '@/components/app-actiobar';
import { KbEntryList } from '@/features/support/components/kb-entry-list';
import { metaObject } from '@/utils/helpers';
import { t } from '@lingui/core/macro';

export const meta: Route.MetaFunction = () => metaObject(t`Knowledge Base`);

export default function KnowledgeBasePage() {
  return (
    <>
      <AppActionBar>{null}</AppActionBar>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-xl font-semibold">{t`Knowledge Base`}</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {t`Reusable articles and FAQ entries promoted from support conversations.`}
          </p>
        </div>
        <KbEntryList />
      </div>
    </>
  );
}
