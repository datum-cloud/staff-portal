// Test fixtures for data-table module
import { vi } from 'vitest';

export interface TestUser {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'active' | 'inactive';
  createdAt: string;
}

export interface TestUserListResponse {
  code: string;
  data: {
    items: TestUser[];
    metadata: {
      continue?: string;
      total?: number;
    };
  };
  path: string;
}

export const dataTableFixtures = {
  empty: {
    code: 'API_REQUEST_SUCCESS',
    data: {
      items: [],
      metadata: {
        total: 0,
      },
    },
    path: '/api/users',
  } as TestUserListResponse,

  withUsers: {
    code: 'API_REQUEST_SUCCESS',
    data: {
      items: [
        {
          id: '1',
          name: 'John Doe',
          email: 'john@example.com',
          role: 'admin',
          status: 'active',
          createdAt: '2024-01-01T00:00:00Z',
        },
        {
          id: '2',
          name: 'Jane Smith',
          email: 'jane@example.com',
          role: 'user',
          status: 'active',
          createdAt: '2024-01-02T00:00:00Z',
        },
        {
          id: '3',
          name: 'Bob Johnson',
          email: 'bob@example.com',
          role: 'user',
          status: 'inactive',
          createdAt: '2024-01-03T00:00:00Z',
        },
      ],
      metadata: {
        total: 3,
        continue: 'next-page-token',
      },
    },
    path: '/api/users',
  } as TestUserListResponse,

  withPagination: {
    code: 'API_REQUEST_SUCCESS',
    data: {
      items: [
        {
          id: '4',
          name: 'Alice Brown',
          email: 'alice@example.com',
          role: 'user',
          status: 'active',
          createdAt: '2024-01-04T00:00:00Z',
        },
        {
          id: '5',
          name: 'Charlie Wilson',
          email: 'charlie@example.com',
          role: 'admin',
          status: 'active',
          createdAt: '2024-01-05T00:00:00Z',
        },
      ],
      metadata: {
        total: 5,
        continue: 'next-page-token-2',
      },
    },
    path: '/api/users',
  } as TestUserListResponse,

  error: {
    code: 'API_REQUEST_ERROR',
    message: 'Failed to fetch users',
    path: '/api/users',
  },

  malformed: {
    code: 'API_REQUEST_SUCCESS',
    data: {
      // Missing items array
      metadata: {
        total: 0,
      },
    },
    path: '/api/users',
  } as any,

  networkError: new Error('Network error'),
};

// Mock actions for testing
export const mockActions = [
  {
    label: 'Edit',
    icon: () => <span data-testid="edit-icon">✏️</span>,
    onClick: vi.fn(),
  },
  {
    label: 'Delete',
    icon: () => <span data-testid="delete-icon">🗑️</span>,
    variant: 'destructive' as const,
    onClick: vi.fn(),
  },
  {
    label: 'View',
    onClick: vi.fn(),
  },
];

// Mock columns for testing
export const mockColumns = [
  {
    accessorKey: 'name',
    header: 'Name',
  },
  {
    accessorKey: 'email',
    header: 'Email',
  },
  {
    accessorKey: 'role',
    header: 'Role',
  },
  {
    accessorKey: 'status',
    header: 'Status',
  },
];
