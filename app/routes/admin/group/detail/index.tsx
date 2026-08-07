import { getGroupDetailMetadata, useGroupDetailData } from '../shared';
import type { Route } from './+types/index';
import { BadgeCondition } from '@/components/badge';
import { DateTime } from '@/components/date';
import { DescriptionList, type DescriptionListItem } from '@/components/description-list';
import { metaObject } from '@/utils/helpers';
import { Card, CardContent, CardHeader, CardTitle } from '@datum-cloud/datum-ui/card';
import { Col, Row } from '@datum-cloud/datum-ui/grid';
import { Trans } from '@lingui/react/macro';

export const meta: Route.MetaFunction = ({ matches }) => {
  const { groupName } = getGroupDetailMetadata(matches);
  return metaObject(`Overview - ${groupName}`);
};

export const handle = {
  breadcrumb: () => <Trans>Overview</Trans>,
};

export default function Page() {
  const data = useGroupDetailData();
  const meta = data.metadata;
  const displayName = meta?.annotations?.['kubernetes.io/display-name'] || meta?.name || '';
  const description = meta?.annotations?.['kubernetes.io/description'];

  const items: DescriptionListItem[] = [
    { label: <Trans>Name</Trans>, value: displayName },
    {
      label: <Trans>ID</Trans>,
      value: <span className="font-mono text-xs">{meta?.name ?? '—'}</span>,
    },
    { label: <Trans>Description</Trans>, value: description, hidden: !description },
    {
      label: <Trans>Status</Trans>,
      value: data.status ? (
        <BadgeCondition status={data.status} multiple={false} showMessage className="text-xs" />
      ) : (
        '—'
      ),
    },
    { label: <Trans>Created</Trans>, value: <DateTime date={meta?.creationTimestamp} /> },
  ];

  return (
    <div className="m-4">
      <Row className="mb-4">
        <Col xs={24} md={{ span: 12, offset: 6 }}>
          <Card>
            <CardHeader>
              <CardTitle>
                <Trans>Group Information</Trans>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DescriptionList items={items} />
            </CardContent>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
