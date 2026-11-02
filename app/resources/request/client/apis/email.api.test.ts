import {
  EMAIL_PAGE_SIZE,
  emailListQuery,
  listAllEmails,
  projectSuspensionWarningEmailListQuery,
} from './email.api';
import { listNotificationMiloapisComV1Alpha1NamespacedEmail } from '@openapi/notification.miloapis.com/v1alpha1';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@openapi/notification.miloapis.com/v1alpha1', () => ({
  listNotificationMiloapisComV1Alpha1NamespacedEmail: vi.fn(),
}));

const listEmails = vi.mocked(listNotificationMiloapisComV1Alpha1NamespacedEmail);

const email = (name: string) => ({ metadata: { name } });

// The SDK resolves to the proxy envelope: `response.data.data` is the Email list.
const page = (names: string[], next?: string) =>
  ({
    data: {
      data: {
        kind: 'EmailList',
        items: names.map(email),
        metadata: next ? { continue: next } : {},
      },
    },
  }) as never;

const sentQueries = () => listEmails.mock.calls.map(([options]) => options.query);

describe('listAllEmails', () => {
  beforeEach(() => listEmails.mockReset());

  it('walks every page and merges the items in order', async () => {
    listEmails
      .mockResolvedValueOnce(page(['a', 'b'], 'cursor-1'))
      .mockResolvedValueOnce(page(['c'], 'cursor-2'))
      .mockResolvedValueOnce(page(['d']));

    const list = await listAllEmails('milo-system');

    expect(list.items.map((item) => item.metadata?.name)).toEqual(['a', 'b', 'c', 'd']);
    expect(list.kind).toBe('EmailList');
    expect(list.metadata?.continue).toBeUndefined();
    expect(sentQueries()).toEqual([
      { limit: EMAIL_PAGE_SIZE },
      { limit: EMAIL_PAGE_SIZE, continue: 'cursor-1' },
      { limit: EMAIL_PAGE_SIZE, continue: 'cursor-2' },
    ]);
  });

  it('stops after one request when there is no continue token', async () => {
    listEmails.mockResolvedValueOnce(page(['a']));

    const list = await listAllEmails('milo-system');

    expect(listEmails).toHaveBeenCalledTimes(1);
    expect(list.items).toHaveLength(1);
  });

  it('returns an empty list when the namespace has no emails', async () => {
    listEmails.mockResolvedValueOnce(page([]));

    const list = await listAllEmails('milo-system');

    expect(list.items).toEqual([]);
  });

  it('keeps the label selector and signal on every page', async () => {
    const { signal } = new AbortController();
    listEmails.mockResolvedValueOnce(page(['a'], 'cursor-1')).mockResolvedValueOnce(page(['b']));

    await listAllEmails('milo-system', { labelSelector: 'kind=warning', signal });

    listEmails.mock.calls.forEach(([options]) => {
      expect(options.signal).toBe(signal);
      expect(options.path).toEqual({ namespace: 'milo-system' });
      expect(options.query?.labelSelector).toBe('kind=warning');
    });
  });
});

describe('emailListQuery', () => {
  beforeEach(() => listEmails.mockReset());

  it('lists the namespace without a label selector and forwards the signal', async () => {
    const { signal } = new AbortController();
    listEmails.mockResolvedValueOnce(page(['a']));

    await emailListQuery('milo-system', signal);

    const [[options]] = listEmails.mock.calls;
    expect(options.signal).toBe(signal);
    expect(options.query).toEqual({ limit: 100 });
  });
});

describe('projectSuspensionWarningEmailListQuery', () => {
  beforeEach(() => listEmails.mockReset());

  it('filters milo-system by project name and warning kind', async () => {
    listEmails.mockResolvedValueOnce(page([]));

    await projectSuspensionWarningEmailListQuery('proj-a');

    const [[options]] = listEmails.mock.calls;
    expect(options.path).toEqual({ namespace: 'milo-system' });
    expect(options.query?.labelSelector).toBe(
      'resourcemanager.miloapis.com/project-name=proj-a,notification.miloapis.com/notification-kind=project-suspension-deletion-warning'
    );
  });
});
