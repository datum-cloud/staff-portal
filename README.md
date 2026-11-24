<p align="center">
  <img width="60px" src="docs/assets/logo.png">

  <h1 align="center">Datum Staff Portal</h1>

  <p align="center">
    Simplifying cloud operations
  </p>
</p>

## Overview

[![FOSSA Status](https://app.fossa.com/api/projects/git%2Bgithub.com%2Fdatum-cloud%2Fstaff-portal.svg?type=shield)](https://app.fossa.com/projects/git%2Bgithub.com%2Fdatum-cloud%2Fstaff-portal?ref=badge_shield)

Datum Staff Portal is a modern web application built with React and TypeScript, designed to streamline cloud operations management. The application uses the latest React Router v7 and runs on Node.js.

## Tech Stack

- **Runtime**: Node.js 26 (see `.nvmrc`)
- **Frontend Framework**: React 19
- **Routing**: React Router 7
- **Styling**: TailwindCSS
- **Type Safety**: TypeScript
- **Build Tool**: Vite
- **Server**: Hono
- **Internationalization**: Lingui

## Project Structure

```bash
staff-portal/
├── app/ # Main application code
│ ├── components/ # Reusable UI components
│ ├── constants/ # Application constants
│ ├── features/ # Feature-specific code
│ ├── hooks/ # Custom React hooks
│ ├── layouts/ # Page layouts
│ ├── modules/ # Third-party library integrations and configurations
│ │ └── i18n/ # Internationalization files
│ ├── providers/ # React context providers
│ ├── routes/ # Application routes
│ ├── server/ # Server-side code
│ ├── styles/ # Global styles
│ └── utils/ # Utility functions
├── cypress/ # Cypress test files
│ ├── e2e/ # End-to-end test files
│ ├── fixtures/ # Test fixtures and mock data
│ ├── support/ # Support files and custom commands
│ └── component/ # Component test files
├── docs/ # Documentation
├── public/ # Static assets
└── .github/ # GitHub configuration
```

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 26.13.1 (see `.nvmrc`)
- [pnpm](https://pnpm.io/) 12. Node 26 ships without corepack, so install it once with `npm install -g pnpm@12`; it then switches to the version `package.json` pins (`packageManager`) on its own.

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/datum-cloud/staff-portal.git
   cd staff-portal
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

### Development

Start the development server:

```bash
pnpm dev
```

### Building

Build the application:

```bash
pnpm build
```

### Running Production Build

Start the production server:

```bash
pnpm start
```

## Available Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build the application
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint
- `pnpm format` - Format code with Prettier
- `pnpm typecheck` - Run TypeScript type checking
- `pnpm test` - Run the vitest unit tests
- `pnpm i18n:extract` - Extract messages for translation
- `pnpm i18n:compile` - Compile translation messages
- `pnpm test:e2e` - Run end-to-end tests in CI mode
- `pnpm test:e2e:prod` - Run end-to-end tests against production build
- `pnpm test:e2e:debug` - Open Cypress Test Runner for E2E tests
- `pnpm test:unit:prod` - Run component tests in CI mode
- `pnpm test:unit:debug` - Open Cypress Test Runner for component tests

## Testing

The project uses vitest for unit tests and Cypress for end-to-end (e2e) and component testing:

### Unit Testing

- Unit tests sit next to the code they cover as `*.test.ts` files under `app/`
- Run them with `pnpm test`

### Component Testing

- Component tests are written using Cypress Component Testing
- Tests are located in the `cypress/component` directory
- Run component tests in CI mode with `pnpm test:unit:prod`
- Open Cypress Test Runner for component tests with `pnpm test:unit:debug`

### End-to-End Testing

- E2E tests are written using Cypress
- Tests are located in the `cypress/e2e` directory
- Run E2E tests in CI mode with `pnpm test:e2e`
- Run E2E tests against production build with `pnpm test:e2e:prod`
- Open Cypress Test Runner for E2E tests with `pnpm test:e2e:debug`

## Code Quality

The project uses several tools to maintain code quality:

- ESLint for code linting
- Prettier for code formatting
- TypeScript for type safety
- Lefthook for git hooks

## Contributing

1. Create a new branch for your feature
2. Make your changes
3. Submit a pull request

## License

[![FOSSA Status](https://app.fossa.com/api/projects/git%2Bgithub.com%2Fdatum-cloud%2Fstaff-portal.svg?type=large)](https://app.fossa.com/projects/git%2Bgithub.com%2Fdatum-cloud%2Fstaff-portal?ref=badge_large)
