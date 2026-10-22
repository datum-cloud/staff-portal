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

- [Node.js](https://nodejs.org/) 26.12.1 (see `.nvmrc`)

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/datum-cloud/staff-portal.git
   cd staff-portal
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

### Development

Start the development server:

```bash
npm run dev
```

### Building

Build the application:

```bash
npm run build
```

### Running Production Build

Start the production server:

```bash
npm run start
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build the application
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier
- `npm run typecheck` - Run TypeScript type checking
- `npm test` - Run the vitest unit tests
- `npm run extract` - Extract messages for translation
- `npm run compile` - Compile translation messages
- `npm run test:e2e` - Run end-to-end tests in CI mode
- `npm run test:e2e:prod` - Run end-to-end tests against production build
- `npm run test:e2e:debug` - Open Cypress Test Runner for E2E tests
- `npm run test:unit:prod` - Run component tests in CI mode
- `npm run test:unit:debug` - Open Cypress Test Runner for component tests

## Testing

The project uses vitest for unit tests and Cypress for end-to-end (e2e) and component testing:

### Unit Testing

- Unit tests sit next to the code they cover as `*.test.ts` files under `app/`
- Run them with `npm test`

### Component Testing

- Component tests are written using Cypress Component Testing
- Tests are located in the `cypress/component` directory
- Run component tests in CI mode with `npm run test:unit:prod`
- Open Cypress Test Runner for component tests with `npm run test:unit:debug`

### End-to-End Testing

- E2E tests are written using Cypress
- Tests are located in the `cypress/e2e` directory
- Run E2E tests in CI mode with `npm run test:e2e`
- Run E2E tests against production build with `npm run test:e2e:prod`
- Open Cypress Test Runner for E2E tests with `npm run test:e2e:debug`

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
