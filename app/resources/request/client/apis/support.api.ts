import type {
  ComMiloApisSupportV1Alpha1SupportTicket,
  ComMiloApisSupportV1Alpha1SupportMessage,
  ComMiloApisSupportV1Alpha1UserReference,
  ComMiloApisSupportV1Alpha1KnowledgeBaseEntry,
} from '@openapi/support.miloapis.com/v1alpha1';
import {
  listSupportMiloapisComV1Alpha1SupportTicket,
  readSupportMiloapisComV1Alpha1SupportTicket,
  createSupportMiloapisComV1Alpha1SupportTicket,
  patchSupportMiloapisComV1Alpha1SupportTicket,
  deleteSupportMiloapisComV1Alpha1SupportTicket,
  listSupportMiloapisComV1Alpha1SupportMessage,
  createSupportMiloapisComV1Alpha1SupportMessage,
  patchSupportMiloapisComV1Alpha1SupportMessage,
  listSupportMiloapisComV1Alpha1KnowledgeBaseEntry,
  createSupportMiloapisComV1Alpha1KnowledgeBaseEntry,
  patchSupportMiloapisComV1Alpha1KnowledgeBaseEntry,
  deleteSupportMiloapisComV1Alpha1KnowledgeBaseEntry,
} from '@openapi/support.miloapis.com/v1alpha1';

export interface TicketListParams {
  fieldSelector?: string;
  limit?: number;
  continue?: string;
  status?: string;
  orgName?: string;
  ownerName?: string;
}

export const ticketListQuery = async (params?: TicketListParams) => {
  const selectors: string[] = [];
  if (params?.status) selectors.push(`spec.status=${params.status}`);
  if (params?.orgName) selectors.push(`spec.organizationRef.name=${params.orgName}`);
  if (params?.ownerName) selectors.push(`spec.ownerRef.name=${params.ownerName}`);
  if (params?.fieldSelector) selectors.push(params.fieldSelector);

  const response = await listSupportMiloapisComV1Alpha1SupportTicket({
    fieldSelector: selectors.length ? selectors.join(',') : undefined,
    limit: params?.limit,
    continue: params?.continue,
  });
  return response.data;
};

export const ticketDetailQuery = async (name: string) => {
  const response = await readSupportMiloapisComV1Alpha1SupportTicket(name);
  return response.data;
};

export const ticketCreateMutation = async (
  body: Omit<ComMiloApisSupportV1Alpha1SupportTicket, 'apiVersion' | 'kind'>
) => {
  const response = await createSupportMiloapisComV1Alpha1SupportTicket({
    apiVersion: 'support.miloapis.com/v1alpha1',
    kind: 'SupportTicket',
    ...body,
  });
  return response.data;
};

export const ticketPatchMutation = async (
  name: string,
  patch: Partial<ComMiloApisSupportV1Alpha1SupportTicket['spec']>
) => {
  const response = await patchSupportMiloapisComV1Alpha1SupportTicket(name, { spec: patch });
  return response.data;
};

export const ticketDeleteMutation = async (name: string) => {
  return deleteSupportMiloapisComV1Alpha1SupportTicket(name);
};

export const messageListQuery = async (ticketName: string) => {
  const response = await listSupportMiloapisComV1Alpha1SupportMessage({
    fieldSelector: `spec.ticketRef=${ticketName}`,
  });
  return response.data;
};

export const messageCreateMutation = async (
  ticketName: string,
  body: string,
  authorRef: ComMiloApisSupportV1Alpha1UserReference,
  internal: boolean = false
) => {
  const response = await createSupportMiloapisComV1Alpha1SupportMessage({
    apiVersion: 'support.miloapis.com/v1alpha1',
    kind: 'SupportMessage',
    metadata: { generateName: 'msg-' },
    spec: {
      ticketRef: ticketName,
      body,
      authorRef,
      authorType: 'staff',
      internal,
    },
  });
  return response.data;
};

export const messagePatchMutation = async (name: string, body: string) => {
  const response = await patchSupportMiloapisComV1Alpha1SupportMessage(name, {
    spec: { body },
  });
  return response.data;
};

export const ticketMarkReadMutation = async (ticketName: string, principalId: string) => {
  const response = await patchSupportMiloapisComV1Alpha1SupportTicket(ticketName, {
    status: { readState: { [principalId]: new Date().toISOString() } },
  });
  return response.data;
};

export const ticketUpdateLastActivityMutation = async (ticketName: string) => {
  const response = await patchSupportMiloapisComV1Alpha1SupportTicket(ticketName, {
    status: { lastActivity: new Date().toISOString() },
  });
  return response.data;
};

export interface KnowledgeBaseListParams {
  topic?: string;
  fieldSelector?: string;
}

export const kbEntryListQuery = async (params?: KnowledgeBaseListParams) => {
  const selectors: string[] = [];
  if (params?.topic) selectors.push(`spec.topic=${params.topic}`);
  if (params?.fieldSelector) selectors.push(params.fieldSelector);

  const response = await listSupportMiloapisComV1Alpha1KnowledgeBaseEntry({
    fieldSelector: selectors.length ? selectors.join(',') : undefined,
  });
  return response.data;
};

export const kbEntryCreateMutation = async (
  entry: Omit<ComMiloApisSupportV1Alpha1KnowledgeBaseEntry, 'apiVersion' | 'kind'>
) => {
  const response = await createSupportMiloapisComV1Alpha1KnowledgeBaseEntry({
    apiVersion: 'support.miloapis.com/v1alpha1',
    kind: 'KnowledgeBaseEntry',
    ...entry,
  });
  return response.data;
};

export const kbEntryPatchMutation = async (
  name: string,
  patch: Partial<ComMiloApisSupportV1Alpha1KnowledgeBaseEntry['spec']>
) => {
  const response = await patchSupportMiloapisComV1Alpha1KnowledgeBaseEntry(name, { spec: patch });
  return response.data;
};

export const kbEntryDeleteMutation = async (name: string) => {
  return deleteSupportMiloapisComV1Alpha1KnowledgeBaseEntry(name);
};
