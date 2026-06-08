import { BillingAccountList } from '@/features/billing';
import { metaObject } from '@/utils/helpers';
import { t } from '@lingui/core/macro';
import type { MetaFunction } from 'react-router';

export const meta: MetaFunction = () => metaObject(t`Billing Accounts`);

export default function Page() {
  return <BillingAccountList />;
}
