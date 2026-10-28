import type { Route } from './+types/index';
import AppActionBar from '@/components/app-actiobar';
import { ContactList } from '@/features/contact';
import { contactListQuery } from '@/resources/request/client';
import { contactRoutes } from '@/utils/config/routes.config';
import { metaObject } from '@/utils/helpers';
import { Button } from '@datum-cloud/datum-ui/button';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import { PlusCircleIcon } from 'lucide-react';
import { useNavigate } from 'react-router';

export const meta: Route.MetaFunction = () => {
  return metaObject(t`Contacts`);
};

export default function Page() {
  const navigate = useNavigate();

  return (
    <>
      <AppActionBar>
        <Button
          type="primary"
          icon={<PlusCircleIcon size={16} />}
          onClick={() => navigate(contactRoutes.create())}>
          <Trans>Add</Trans>
        </Button>
      </AppActionBar>
      <ContactList queryKeyPrefix="contacts" fetchFn={() => contactListQuery()} />
    </>
  );
}
