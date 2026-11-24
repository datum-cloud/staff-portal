import { getGroupDetailMetadata, useGroupDetailData } from '../shared';
import type { Route } from './+types/index';
import { BadgeCondition } from '@/components/badge';
import { DangerZoneCard } from '@/components/danger-zone-card';
import { DateTime } from '@/components/date';
import { DescriptionList, type DescriptionListItem } from '@/components/description-list';
import { EditGroupDialog } from '@/features/group';
import { useDeleteGroupMutation, useGroupMembershipListQuery } from '@/resources/request/client';
import { ACTION_ICONS } from '@/utils/config/icons.config';
import { groupRoutes } from '@/utils/config/routes.config';
import { metaObject } from '@/utils/helpers';
import { Button } from '@datum-cloud/datum-ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@datum-cloud/datum-ui/card';
import { Col, Row } from '@datum-cloud/datum-ui/grid';
import { toast } from '@datum-cloud/datum-ui/toast';
import { Text } from '@datum-cloud/datum-ui/typography';
import { Trans, useLingui } from '@lingui/react/macro';
import { useState } from 'react';
import { useNavigate } from 'react-router';

export const meta: Route.MetaFunction = ({ matches }) => {
  const { groupName } = getGroupDetailMetadata(matches);
  return metaObject(`Overview - ${groupName}`);
};

export const handle = {
  breadcrumb: () => <Trans>Overview</Trans>,
};

export default function Page() {
  const { t } = useLingui();
  const navigate = useNavigate();
  const data = useGroupDetailData();
  const meta = data.metadata;
  const [editOpen, setEditOpen] = useState(false);
  const deleteGroup = useDeleteGroupMutation();
  // For the delete warning: deleting a group takes away what it grants its members.
  const members = useGroupMembershipListQuery(meta?.namespace ?? '', meta?.name ?? '');
  const memberCount = members.data?.items?.length ?? 0;
  const displayName = meta?.annotations?.['kubernetes.io/display-name'] || meta?.name || '';
  const description = meta?.annotations?.['kubernetes.io/description'];

  const items: DescriptionListItem[] = [
    { label: <Trans>Name</Trans>, value: displayName },
    {
      label: <Trans>ID</Trans>,
      value: (
        <Text size="xs" className="font-mono">
          {meta?.name ?? '—'}
        </Text>
      ),
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
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <CardTitle>
                <Trans>Group Information</Trans>
              </CardTitle>
              <Button
                size="xs"
                theme="outline"
                icon={<ACTION_ICONS.edit size={14} />}
                onClick={() => setEditOpen(true)}>
                <Trans>Edit</Trans>
              </Button>
            </CardHeader>
            <CardContent>
              <DescriptionList items={items} />
            </CardContent>
          </Card>
        </Col>
      </Row>

      <Row className="mb-4">
        <Col xs={24} md={{ span: 12, offset: 6 }}>
          <DangerZoneCard
            deleteTitle={t`Delete Group`}
            deleteDescription={t`Permanently delete this group`}
            dialogTitle={t`Delete Group`}
            dialogDescription={
              memberCount === 0
                ? t`Delete "${displayName}"? This can't be undone.`
                : memberCount === 1
                  ? t`Delete "${displayName}"? Its 1 member loses any access this group grants. This can't be undone.`
                  : t`Delete "${displayName}"? Its ${memberCount} members lose any access this group grants. This can't be undone.`
            }
            onConfirm={async () => {
              await deleteGroup.mutateAsync(meta);
              toast.success(t`Group deleted`);
              navigate(groupRoutes.list());
            }}
          />
        </Col>
      </Row>

      <EditGroupDialog group={data} open={editOpen} onOpenChange={setEditOpen} />
    </div>
  );
}
