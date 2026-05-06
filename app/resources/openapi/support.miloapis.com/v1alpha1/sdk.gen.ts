// Hand-written SDK for support.miloapis.com/v1alpha1.
// Mirrors the @hey-api/openapi-ts generated pattern used by other API groups.
//
// NOTE: client-side calls go through /api/internal proxy which wraps responses in:
//   { code: string, data: <actual data>, path: string, requestId?: string }
// We unwrap that wrapper here so callers get the actual API resource directly.

import { httpClient } from '@/modules/axios/axios.client';
import type {
  ComMiloApisSupportV1Alpha1SupportTicket,
  ComMiloApisSupportV1Alpha1SupportTicketList,
  ComMiloApisSupportV1Alpha1SupportTicketStatus,
  ComMiloApisSupportV1Alpha1SupportMessage,
  ComMiloApisSupportV1Alpha1SupportMessageList,
  ComMiloApisSupportV1Alpha1KnowledgeBaseEntry,
  ComMiloApisSupportV1Alpha1KnowledgeBaseEntryList,
} from './types.gen';

const BASE = '/apis/support.miloapis.com/v1alpha1';

type ProxyResponse<T> = { code: string; data: T; path: string; requestId?: string };

function unwrap<T>(response: { data: ProxyResponse<T> | T }): { data: T } {
  const d = response.data as any;
  // If the response has a 'code' field it's the proxy wrapper
  if (d && typeof d === 'object' && 'code' in d && 'data' in d) {
    return { ...response, data: d.data as T };
  }
  return response as { data: T };
}

// ── SupportTicket ────────────────────────────────────────────────────────────

export const listSupportMiloapisComV1Alpha1SupportTicket = async (params?: {
  fieldSelector?: string;
  labelSelector?: string;
  limit?: number;
  continue?: string;
}) => {
  const response = await httpClient.get<ProxyResponse<ComMiloApisSupportV1Alpha1SupportTicketList>>(
    `${BASE}/supporttickets`,
    { params }
  );
  return unwrap<ComMiloApisSupportV1Alpha1SupportTicketList>(response);
};

export const readSupportMiloapisComV1Alpha1SupportTicket = async (name: string) => {
  const response = await httpClient.get<ProxyResponse<ComMiloApisSupportV1Alpha1SupportTicket>>(
    `${BASE}/supporttickets/${name}`
  );
  return unwrap<ComMiloApisSupportV1Alpha1SupportTicket>(response);
};

export const createSupportMiloapisComV1Alpha1SupportTicket = async (
  body: ComMiloApisSupportV1Alpha1SupportTicket
) => {
  const response = await httpClient.post<ProxyResponse<ComMiloApisSupportV1Alpha1SupportTicket>>(
    `${BASE}/supporttickets`,
    body
  );
  return unwrap<ComMiloApisSupportV1Alpha1SupportTicket>(response);
};

export const patchSupportMiloapisComV1Alpha1SupportTicket = async (
  name: string,
  patch: Partial<{
    spec: Partial<ComMiloApisSupportV1Alpha1SupportTicket['spec']>;
    status: Partial<ComMiloApisSupportV1Alpha1SupportTicketStatus>;
  }>
) => {
  const response = await httpClient.patch<ProxyResponse<ComMiloApisSupportV1Alpha1SupportTicket>>(
    `${BASE}/supporttickets/${name}`,
    patch,
    { params: { fieldManager: 'datum-staff-portal' }, headers: { 'Content-Type': 'application/merge-patch+json' } }
  );
  return unwrap<ComMiloApisSupportV1Alpha1SupportTicket>(response);
};

export const deleteSupportMiloapisComV1Alpha1SupportTicket = async (name: string) => {
  return httpClient.delete(`${BASE}/supporttickets/${name}`);
};

// ── SupportMessage ───────────────────────────────────────────────────────────

export const listSupportMiloapisComV1Alpha1SupportMessage = async (params?: {
  fieldSelector?: string;
  labelSelector?: string;
  limit?: number;
  continue?: string;
}) => {
  const response = await httpClient.get<ProxyResponse<ComMiloApisSupportV1Alpha1SupportMessageList>>(
    `${BASE}/supportmessages`,
    { params }
  );
  return unwrap<ComMiloApisSupportV1Alpha1SupportMessageList>(response);
};

export const readSupportMiloapisComV1Alpha1SupportMessage = async (name: string) => {
  const response = await httpClient.get<ProxyResponse<ComMiloApisSupportV1Alpha1SupportMessage>>(
    `${BASE}/supportmessages/${name}`
  );
  return unwrap<ComMiloApisSupportV1Alpha1SupportMessage>(response);
};

export const createSupportMiloapisComV1Alpha1SupportMessage = async (
  body: ComMiloApisSupportV1Alpha1SupportMessage
) => {
  const response = await httpClient.post<ProxyResponse<ComMiloApisSupportV1Alpha1SupportMessage>>(
    `${BASE}/supportmessages`,
    body
  );
  return unwrap<ComMiloApisSupportV1Alpha1SupportMessage>(response);
};

export const patchSupportMiloapisComV1Alpha1SupportMessage = async (
  name: string,
  patch: Partial<{ spec: Partial<ComMiloApisSupportV1Alpha1SupportMessage['spec']> }>
) => {
  const response = await httpClient.patch<ProxyResponse<ComMiloApisSupportV1Alpha1SupportMessage>>(
    `${BASE}/supportmessages/${name}`,
    patch,
    { params: { fieldManager: 'datum-staff-portal' }, headers: { 'Content-Type': 'application/merge-patch+json' } }
  );
  return unwrap<ComMiloApisSupportV1Alpha1SupportMessage>(response);
};

// ── KnowledgeBaseEntry ───────────────────────────────────────────────────────

export const listSupportMiloapisComV1Alpha1KnowledgeBaseEntry = async (params?: {
  fieldSelector?: string;
  labelSelector?: string;
  limit?: number;
  continue?: string;
}) => {
  const response = await httpClient.get<ProxyResponse<ComMiloApisSupportV1Alpha1KnowledgeBaseEntryList>>(
    `${BASE}/knowledgebaseentries`,
    { params }
  );
  return unwrap<ComMiloApisSupportV1Alpha1KnowledgeBaseEntryList>(response);
};

export const readSupportMiloapisComV1Alpha1KnowledgeBaseEntry = async (name: string) => {
  const response = await httpClient.get<ProxyResponse<ComMiloApisSupportV1Alpha1KnowledgeBaseEntry>>(
    `${BASE}/knowledgebaseentries/${name}`
  );
  return unwrap<ComMiloApisSupportV1Alpha1KnowledgeBaseEntry>(response);
};

export const createSupportMiloapisComV1Alpha1KnowledgeBaseEntry = async (
  body: ComMiloApisSupportV1Alpha1KnowledgeBaseEntry
) => {
  const response = await httpClient.post<ProxyResponse<ComMiloApisSupportV1Alpha1KnowledgeBaseEntry>>(
    `${BASE}/knowledgebaseentries`,
    body
  );
  return unwrap<ComMiloApisSupportV1Alpha1KnowledgeBaseEntry>(response);
};

export const patchSupportMiloapisComV1Alpha1KnowledgeBaseEntry = async (
  name: string,
  patch: Partial<{ spec: Partial<ComMiloApisSupportV1Alpha1KnowledgeBaseEntry['spec']> }>
) => {
  const response = await httpClient.patch<ProxyResponse<ComMiloApisSupportV1Alpha1KnowledgeBaseEntry>>(
    `${BASE}/knowledgebaseentries/${name}`,
    patch,
    { params: { fieldManager: 'datum-staff-portal' }, headers: { 'Content-Type': 'application/merge-patch+json' } }
  );
  return unwrap<ComMiloApisSupportV1Alpha1KnowledgeBaseEntry>(response);
};

export const deleteSupportMiloapisComV1Alpha1KnowledgeBaseEntry = async (name: string) => {
  return httpClient.delete(`${BASE}/knowledgebaseentries/${name}`);
};
