import { ListQueryParams } from '@/resources/schemas';
import {
  ComMiloapisIamV1Alpha1Group,
  ComMiloapisIamV1Alpha1GroupMembership,
  createIamMiloapisComV1Alpha1NamespacedGroup,
  createIamMiloapisComV1Alpha1NamespacedGroupMembership,
  deleteIamMiloapisComV1Alpha1NamespacedGroup,
  deleteIamMiloapisComV1Alpha1NamespacedGroupMembership,
  listIamMiloapisComV1Alpha1GroupForAllNamespaces,
  listIamMiloapisComV1Alpha1NamespacedGroupMembership,
  patchIamMiloapisComV1Alpha1NamespacedGroup,
} from '@openapi/iam.miloapis.com/v1alpha1';

/** Where staff groups live; groups an organization creates live in its own namespace. */
export const STAFF_GROUP_NAMESPACE = 'milo-system';

export const GROUP_DISPLAY_NAME_ANNOTATION = 'kubernetes.io/display-name';
export const GROUP_DESCRIPTION_ANNOTATION = 'kubernetes.io/description';

/** The editable parts of a group: its display name and description. */
export interface GroupDetailsInput {
  displayName: string;
  description?: string;
}

export const groupListQuery = async (params?: ListQueryParams) => {
  const response = await listIamMiloapisComV1Alpha1GroupForAllNamespaces({
    query: {
      ...(params?.limit && { limit: params.limit }),
      ...(params?.cursor && { continue: params.cursor }),
    },
  });
  return response.data.data;
};

export const groupMembershipDeleteMutation = (
  metadata: ComMiloapisIamV1Alpha1GroupMembership['metadata']
) => {
  return deleteIamMiloapisComV1Alpha1NamespacedGroupMembership({
    path: { namespace: metadata?.namespace ?? '', name: metadata?.name ?? '' },
  });
};

export const groupMembershipCreateMutation = async (
  namespace: string,
  payload: ComMiloapisIamV1Alpha1GroupMembership['spec']
) => {
  const response = await createIamMiloapisComV1Alpha1NamespacedGroupMembership({
    path: { namespace },
    body: {
      apiVersion: 'iam.miloapis.com/v1alpha1',
      kind: 'GroupMembership',
      metadata: { generateName: 'group-membership-', namespace },
      spec: payload,
    },
  });
  return response.data.data;
};

/**
 * The memberships of one group: only those in the group's own namespace, so
 * two groups with the same name in different namespaces don't share members.
 */
export const groupMembershipsForGroupQuery = async (namespace: string, groupName: string) => {
  const response = await listIamMiloapisComV1Alpha1NamespacedGroupMembership({
    path: { namespace },
    query: { fieldSelector: `spec.groupRef.name=${groupName}` },
  });
  return response.data.data;
};

/** Creates a staff group with the given ID (metadata.name) in `milo-system`. */
export const groupCreateMutation = async (name: string, details: GroupDetailsInput) => {
  const description = details.description?.trim();
  const response = await createIamMiloapisComV1Alpha1NamespacedGroup({
    path: { namespace: STAFF_GROUP_NAMESPACE },
    body: {
      apiVersion: 'iam.miloapis.com/v1alpha1',
      kind: 'Group',
      metadata: {
        name,
        namespace: STAFF_GROUP_NAMESPACE,
        annotations: {
          [GROUP_DISPLAY_NAME_ANNOTATION]: details.displayName.trim(),
          ...(description && { [GROUP_DESCRIPTION_ANNOTATION]: description }),
        },
      },
    },
  });
  return response.data.data;
};

/**
 * Updates a group's display name and description. A merge patch on the
 * annotations only; an emptied description is removed (null).
 */
export const groupUpdateMutation = async (
  metadata: ComMiloapisIamV1Alpha1Group['metadata'],
  details: GroupDetailsInput
) => {
  const description = details.description?.trim();
  const response = await patchIamMiloapisComV1Alpha1NamespacedGroup({
    path: { namespace: metadata?.namespace ?? '', name: metadata?.name ?? '' },
    query: { fieldManager: 'datum-staff-portal' },
    headers: { 'Content-Type': 'application/merge-patch+json' },
    body: {
      metadata: {
        annotations: {
          [GROUP_DISPLAY_NAME_ANNOTATION]: details.displayName.trim(),
          [GROUP_DESCRIPTION_ANNOTATION]: description || null,
        },
      },
    } as unknown as ComMiloapisIamV1Alpha1Group,
  });
  return response.data.data;
};

export const groupDeleteMutation = (metadata: ComMiloapisIamV1Alpha1Group['metadata']) =>
  deleteIamMiloapisComV1Alpha1NamespacedGroup({
    path: { namespace: metadata?.namespace ?? '', name: metadata?.name ?? '' },
  });
