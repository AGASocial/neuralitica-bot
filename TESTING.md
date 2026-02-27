# Testing Guide

This project uses Jest and React Testing Library for unit testing. The test suite aims to achieve at least 80% code coverage.

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

## Test Structure

Tests are organized to mirror the source code structure:

```
src/
├── lib/
│   ├── __tests__/
│   │   ├── date-utils.test.ts
│   │   ├── openai-client.test.ts
│   │   ├── openai.test.ts
│   │   ├── openai-responses.test.ts
│   │   ├── supabase.test.ts
│   │   └── auth-server.test.ts
├── contexts/
│   ├── __tests__/
│   │   ├── AuthContext.test.tsx
│   │   ├── ToastContext.test.tsx
│   │   └── ConfirmationContext.test.tsx
├── components/
│   ├── __tests__/
│   │   ├── Toast.test.tsx
│   │   └── ConfirmationDialog.test.tsx
├── app/
│   └── api/
│       └── auth/
│           └── __tests__/
│               ├── get-profile.test.ts
│               ├── logout.test.ts
│               └── update-profile.test.ts
└── middleware/
    └── __tests__/
        └── middleware.test.ts
```

## Test Coverage

The test suite covers:

### Library Utilities (lib/)
- ✅ Date formatting utilities (date-utils.ts)
- ✅ OpenAI client configuration (openai-client.ts)
- ✅ Supabase client creation (supabase.ts)
- ✅ Server-side authentication (auth-server.ts)
- ✅ OpenAI file and vector store operations (openai.ts)
- ✅ OpenAI Responses API integration (openai-responses.ts)

### React Contexts (contexts/)
- ✅ Authentication context (AuthContext.tsx)
- ✅ Toast notification context (ToastContext.tsx)
- ✅ Confirmation dialog context (ConfirmationContext.tsx)

### React Components (components/)
- ✅ Toast component (Toast.tsx)
- ✅ Confirmation dialog component (ConfirmationDialog.tsx)

### API Routes (app/api/)
- ✅ Authentication routes (get-profile, logout, update-profile)
- ✅ Chat API route (route.ts)

### Middleware
- ✅ Route protection and authentication middleware (middleware.ts)

## Writing New Tests

When adding new features, follow these guidelines:

1. **Test file location**: Place test files in `__tests__` directories next to the code they test
2. **Naming convention**: Use `.test.ts` or `.test.tsx` extension
3. **Test structure**: Use `describe` blocks to group related tests
4. **Mocking**: Mock external dependencies (Supabase, OpenAI, etc.)
5. **Coverage**: Aim for 80%+ coverage on new code

## Example Test

```typescript
import { render, screen } from '@testing-library/react'
import MyComponent from '../MyComponent'

describe('MyComponent', () => {
  it('should render correctly', () => {
    render(<MyComponent />)
    expect(screen.getByText('Hello')).toBeInTheDocument()
  })
})
```

## Mocking

The test setup includes mocks for:
- Next.js router (`next/navigation`)
- Next.js headers (`next/headers`)
- Environment variables

Additional mocks are defined in individual test files as needed.

## Coverage Thresholds

The project maintains 80% coverage thresholds for:
- Branches
- Functions
- Lines
- Statements

Run `npm run test:coverage` to see the current coverage report.



