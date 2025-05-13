<p align="center">
  <img width="60px" src="docs/assets/logo.png">
  
  <h1 align="center">Datum Staff Portal</h1>
  
  <p align="center">
    Simplifying cloud operations
  </p>
</p>

## Overview

Datum Staff Portal is a modern web application built with React and TypeScript, designed to streamline cloud operations management. The application uses the latest React Router v7 and is powered by Bun runtime.

## Tech Stack

- **Runtime**: Bun
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
├── docs/ # Documentation
├── public/ # Static assets
└── .github/ # GitHub configuration
```

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) (Latest version)

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/datum-cloud/staff-portal.git
   cd staff-portal
   ```

2. Install dependencies:
   ```bash
   bun install
   ```

### Development

Start the development server:

```bash
bun run dev
```

### Building

Build the application:

```bash
bun run build
```

### Running Production Build

Start the production server:

```bash
bun run start
```

## Available Scripts

- `bun run dev` - Start development server
- `bun run build` - Build the application
- `bun run start` - Start production server
- `bun run lint` - Run ESLint
- `bun run format` - Format code with Prettier
- `bun run typecheck` - Run TypeScript type checking
- `bun run extract` - Extract messages for translation
- `bun run compile` - Compile translation messages

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
