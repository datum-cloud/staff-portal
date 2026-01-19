import { RecentUsersWidget } from './recent-users-widget';
import * as client from '@/resources/request/client';
import { activityListFixture } from '@/tests/fixtures/activity-list';
import { render, screen, waitFor } from '@/tests/setup/unit/test.utils';
import { expect, test, describe, vi, beforeEach } from 'vitest';

vi.mock('@/resources/request/client', () => ({
  activityListQuery: vi.fn(),
}));

const mockActivityListQuery = vi.mocked(client.activityListQuery);

describe('RecentUsersWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Success scenarios', () => {
    test('should render loading state', () => {
      mockActivityListQuery.mockImplementation(() => new Promise(() => {}));

      render(<RecentUsersWidget />);

      const skeletons = screen.getAllByText('');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    test('should render empty state when no users', async () => {
      mockActivityListQuery.mockResolvedValue(activityListFixture.empty);

      render(<RecentUsersWidget />);

      await waitFor(() => {
        expect(screen.getByText('No users yet')).toBeInTheDocument();
        expect(screen.getByText('Users will appear here once they join Datum')).toBeInTheDocument();
      });
    });

    test('should render users when data is available', async () => {
      mockActivityListQuery.mockResolvedValue(activityListFixture.withUsers as any);

      render(<RecentUsersWidget />);

      await waitFor(() => {
        expect(screen.getByText('Evan Vetere')).toBeInTheDocument();
        expect(screen.getByText('evetere@datum.net')).toBeInTheDocument();
        expect(screen.getByText('Zach Smith')).toBeInTheDocument();
        expect(screen.getByText('smith+staff@datum.net')).toBeInTheDocument();
      });
    });

    test('should display correct widget title and description', async () => {
      mockActivityListQuery.mockResolvedValue(activityListFixture.empty);

      render(<RecentUsersWidget />);

      expect(screen.getByText('Recent Users')).toBeInTheDocument();
      expect(screen.getByText('Last 10 new users who joined Datum')).toBeInTheDocument();
    });
  });

  describe('Failure scenarios', () => {
    test('should handle malformed user data gracefully', async () => {
      mockActivityListQuery.mockResolvedValue(activityListFixture.malformed as any);

      render(<RecentUsersWidget />);

      await waitFor(() => {
        expect(screen.queryByText('Evan Vetere')).not.toBeInTheDocument();
      });
    });

    test('should handle API error gracefully', async () => {
      mockActivityListQuery.mockRejectedValue(new Error('API Error'));

      render(<RecentUsersWidget />);

      await waitFor(() => {
        expect(screen.getByText('No users yet')).toBeInTheDocument();
      });
    });

    test('should handle null response gracefully', async () => {
      mockActivityListQuery.mockResolvedValue(null as any);

      render(<RecentUsersWidget />);

      await waitFor(() => {
        expect(screen.getByText('No users yet')).toBeInTheDocument();
      });
    });

    test('should handle missing data property', async () => {
      mockActivityListQuery.mockResolvedValue({
        code: 'API_REQUEST_SUCCESS',
        path: '/api/activity',
      } as any);

      render(<RecentUsersWidget />);

      await waitFor(() => {
        expect(screen.getByText('No users yet')).toBeInTheDocument();
      });
    });

    test('should handle missing logs array', async () => {
      mockActivityListQuery.mockResolvedValue({
        code: 'API_REQUEST_SUCCESS',
        data: {
          logs: [],
          query: '',
          timeRange: { start: '2025-10-14T04:16:07.000Z', end: '2025-10-21T04:16:08.613Z' },
          nextPageToken: undefined,
          hasNextPage: false,
        },
        path: '/api/activity',
      });

      render(<RecentUsersWidget />);

      await waitFor(() => {
        expect(screen.getByText('No users yet')).toBeInTheDocument();
      });
    });

    test('should handle logs with missing user data', async () => {
      mockActivityListQuery.mockResolvedValue({
        code: 'API_REQUEST_SUCCESS',
        data: {
          logs: [
            {
              auditID: 'test-audit-id',
              requestURI: '/apis/test',
              level: 'debug',
              raw: JSON.stringify({
                responseObject: {
                  spec: {
                    email: 'test@example.com',
                    familyName: 'Test',
                    givenName: 'User',
                  },
                },
              }),
            } as any,
          ],
          query: '',
          timeRange: { start: '2025-10-14T04:16:07.000Z', end: '2025-10-21T04:16:08.613Z' },
          nextPageToken: undefined,
          hasNextPage: false,
        },
        path: '/api/activity',
      });

      render(<RecentUsersWidget />);

      await waitFor(() => {
        expect(screen.getByText('Recent Users')).toBeInTheDocument();
        expect(screen.getByText('Last 10 new users who joined Datum')).toBeInTheDocument();
      });
    });

    test('should handle logs with empty raw data', async () => {
      mockActivityListQuery.mockResolvedValue({
        code: 'API_REQUEST_SUCCESS',
        data: {
          logs: [
            {
              auditID: 'test-id',
              requestURI: '/apis/test',
              level: 'debug',
              raw: '',
              user: { username: 'test', uid: 'test', groups: [] },
            } as any,
          ],
          query: '',
          timeRange: { start: '2025-10-14T04:16:07.000Z', end: '2025-10-21T04:16:08.613Z' },
          nextPageToken: undefined,
          hasNextPage: false,
        },
        path: '/api/activity',
      });

      render(<RecentUsersWidget />);

      await waitFor(() => {
        expect(screen.getByText('Recent Users')).toBeInTheDocument();
        expect(screen.getByText('Last 10 new users who joined Datum')).toBeInTheDocument();
      });
    });

    test('should handle logs with missing spec data in raw', async () => {
      mockActivityListQuery.mockResolvedValue({
        code: 'API_REQUEST_SUCCESS',
        data: {
          logs: [
            {
              auditID: 'test-id',
              requestURI: '/apis/test',
              level: 'debug',
              raw: JSON.stringify({
                responseObject: {
                  metadata: {
                    name: 'test-user',
                    creationTimestamp: '2025-10-17T01:56:52Z',
                  },
                },
              }),
              user: { username: 'test', uid: 'test', groups: [] },
            } as any,
          ],
          query: '',
          timeRange: { start: '2025-10-14T04:16:07.000Z', end: '2025-10-21T04:16:08.613Z' },
          nextPageToken: undefined,
          hasNextPage: false,
        },
        path: '/api/activity',
      });

      render(<RecentUsersWidget />);

      await waitFor(() => {
        expect(screen.getByText('Recent Users')).toBeInTheDocument();
        expect(screen.getByText('Last 10 new users who joined Datum')).toBeInTheDocument();
      });
    });

    test('should handle logs with missing email or name fields', async () => {
      mockActivityListQuery.mockResolvedValue({
        code: 'API_REQUEST_SUCCESS',
        data: {
          logs: [
            {
              auditID: 'test-id',
              requestURI: '/apis/test',
              level: 'debug',
              raw: JSON.stringify({
                responseObject: {
                  spec: {},
                  metadata: {
                    name: 'test-user',
                    creationTimestamp: '2025-10-17T01:56:52Z',
                  },
                },
              }),
              user: { username: 'test', uid: 'test', groups: [] },
            } as any,
          ],
          query: '',
          timeRange: { start: '2025-10-14T04:16:07.000Z', end: '2025-10-21T04:16:08.613Z' },
          nextPageToken: undefined,
          hasNextPage: false,
        },
        path: '/api/activity',
      });

      render(<RecentUsersWidget />);

      await waitFor(() => {
        expect(screen.getByText('Recent Users')).toBeInTheDocument();
        expect(screen.getByText('Last 10 new users who joined Datum')).toBeInTheDocument();
      });
    });

    test('should handle network timeout gracefully', async () => {
      mockActivityListQuery.mockImplementation(
        () =>
          new Promise((_, reject) => setTimeout(() => reject(new Error('Network timeout')), 100))
      );

      render(<RecentUsersWidget />);

      await waitFor(() => {
        expect(screen.getByText('No users yet')).toBeInTheDocument();
      });
    });
  });
});
