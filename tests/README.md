# Testing Strategy & Best Practices

## 🎯 **Testing Philosophy**

### **Ultra-Minimal Mocking Strategy**

#### ✅ **Mock Only API Calls (Per Test File)**

- **API calls that make network requests** - Mock in each test file with specific responses
- **Everything else renders normally** - No component mocking unless you encounter real problems

#### ✅ **Render Everything Else**

- **All UI Components** - `@datum-ui/*`, `@/modules/shadcn/ui/*`, `@/components/*`
- **Icons** - `lucide-react`
- **Router hooks** - Test with real behavior
- **Route configurations** - Just static objects
- **Internal utilities** - Test their actual behavior

### **Why This Approach?**

1. **Real UI Testing** - Test actual component behavior and styling
2. **Better Coverage** - Catch real integration issues
3. **Less Maintenance** - No need to update mocks when components change
4. **Faster Development** - Less mock setup per test
5. **Production-like Testing** - Components work exactly like in production

## 🛠 **Test Setup**

### **Global Setup (tests/setup/unit/)**

- **`global.mocks.tsx`** - Global mocks (router hooks, logger)
- **`vitest.setup.ts`** - Initializes Lingui with real translations
- **`test.utils.tsx`** - Custom render with providers (QueryClient + I18n)

**Minimal global mocks!** Only mock what actually causes problems in tests.

### **Test Fixtures (tests/fixtures/)**

- **`activity-list.ts`** - Reusable API response data for tests
- **Centralized test data** - No more inline mock data
- **Type-safe fixtures** - Matches real API response structure

### **Using the Test Utils**

```tsx
// ✅ Good - Use the custom render with alias
import { render, screen, waitFor } from '@/tests/setup/unit/test.utils';

// ❌ Bad - Don't import from @testing-library/react directly
import { render } from '@testing-library/react';
```

## 📝 **Test Structure**

### **Simple Test Pattern**

```tsx
import { MyComponent } from './my-component';
import * as api from '@/resources/request/client';
import { render, screen } from '@/tests/setup/unit/test.utils';
import { expect, test, describe, vi } from 'vitest';

// Mock ONLY the API call for this test
vi.mock('@/resources/request/client', () => ({
  someApiCall: vi.fn(),
}));

const mockApiCall = vi.mocked(api.someApiCall);

describe('MyComponent', () => {
  test('renders correctly', () => {
    mockApiCall.mockResolvedValue({ data: [] });

    render(<MyComponent />);

    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });
});
```

## 🎯 **The Golden Rule**

### **Mock ONLY API Calls, Render Everything Else**

```tsx
// ✅ DO THIS - Mock only API calls per test file
import * as api from '@/resources/request/client';
const mockApiCall = vi.fn();
vi.mocked(api.someApiCall).mockImplementation(mockApiCall);

// ❌ DON'T DO THIS - Don't mock components
vi.mock('@/modules/shadcn/ui/card', () => ({ ... }));
vi.mock('@datum-ui/button', () => ({ ... }));
vi.mock('lucide-react', () => ({ ... }));
vi.mock('@/components/date', () => ({ ... }));
```

### **Why This Works Better**

1. **Real Behavior** - Components work exactly like production
2. **Less Maintenance** - No mock updates when components change
3. **Better Coverage** - Catch real styling and integration issues
4. **Faster Development** - Minimal setup per test

## 🎨 **Component Testing Strategy**

### **1. Test Behavior, Not Implementation**

```tsx
// ✅ Good - Test what the user sees
expect(screen.getByText('User Name')).toBeInTheDocument();

// ❌ Bad - Test implementation details
expect(screen.getByTestId('user-name')).toBeInTheDocument();
```

### **2. Test User Interactions**

```tsx
test('handles user click', async () => {
  render(<MyComponent />);

  await user.click(screen.getByRole('button'));

  expect(screen.getByText('Clicked!')).toBeInTheDocument();
});
```

### **3. Test Loading States**

```tsx
test('shows loading state', () => {
  mockApiCall.mockImplementation(() => new Promise(() => {}));

  render(<MyComponent />);

  expect(screen.getByText('Loading...')).toBeInTheDocument();
});
```

## 🔧 **Common Patterns**

### **API Mocking**

```tsx
import * as api from '@/resources/request/client';

// Mock the module
vi.mock('@/resources/request/client', () => ({
  someApiCall: vi.fn(),
}));

const mockApiCall = vi.mocked(api.someApiCall);

// In your test
mockApiCall.mockResolvedValue({ data: mockData });
```

### **Using Test Fixtures**

```tsx
import { activityListFixture } from '@/tests/fixtures/activity-list';

// Use fixtures for consistent test data
mockApiCall.mockResolvedValue(activityListFixture.withUsers);
```

### **Router Mocking**

```tsx
// Already handled globally, but if you need specific behavior:
import { useNavigate } from 'react-router';

const mockNavigate = vi.fn();
vi.mocked(useNavigate).mockReturnValue(mockNavigate);
```

### **Testing Async Components**

```tsx
test('loads data asynchronously', async () => {
  mockApiCall.mockResolvedValue({ data: mockData });

  render(<MyComponent />);

  await waitFor(() => {
    expect(screen.getByText('Loaded Data')).toBeInTheDocument();
  });
});
```

## 📊 **Benefits of This Approach**

1. **Realistic Testing** - Components behave like they do in production
2. **Less Maintenance** - No need to update mocks when UI changes
3. **Better Coverage** - Catch real styling and behavior issues
4. **Faster Development** - Less setup per test file
5. **Cleaner Tests** - Focus on behavior, not implementation
6. **Reusable Fixtures** - Consistent test data across all tests
7. **Type Safety** - Fixtures match real API response structure

## 🚀 **Quick Start**

1. **Create a new test file**
2. **Import from test-utils** (not @testing-library/react)
3. **Mock only external APIs** (not UI components)
4. **Use test fixtures** for consistent data
5. **Test user-visible behavior**
6. **Use real components** for better coverage

## 🧪 **Test Organization**

### **Group Tests by Scenario**

```tsx
describe('MyComponent', () => {
  describe('Success scenarios', () => {
    test('should render loading state', () => {
      /* ... */
    });
    test('should render data when available', () => {
      /* ... */
    });
  });

  describe('Failure scenarios', () => {
    test('should handle API error gracefully', () => {
      /* ... */
    });
    test('should handle malformed data', () => {
      /* ... */
    });
  });
});
```

### **Standardized Test Descriptions**

- Use "should [action]" pattern
- Be descriptive and clear
- Group related scenarios together
