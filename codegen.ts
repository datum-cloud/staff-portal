import type { CodegenConfig } from '@graphql-codegen/cli';
import * as dotenv from 'dotenv';

// Load environment variables from .env
dotenv.config();

// GraphQL endpoint - must be defined in GRAPHQL_URL env var
const GRAPHQL_ENDPOINT = process.env.GRAPHQL_URL;

if (!GRAPHQL_ENDPOINT) {
  throw new Error('GRAPHQL_URL environment variable is required for GraphQL introspection');
}

const config: CodegenConfig = {
  overwrite: true,
  ignoreNoDocuments: true, // Don't fail if no .graphql files exist yet
  schema: {
    [GRAPHQL_ENDPOINT]: {
      headers: {
        // Add authorization header if needed
        // Authorization: `Bearer ${process.env.AUTH_TOKEN}`,
      },
    },
  },
  documents: ['./app/**/*.graphql', './app/**/*.gql'],
  generates: {
    // Use client-preset for minimal, optimized output
    './app/resources/graphql/gen/': {
      preset: 'client',
      config: {
        scalars: {
          DateTime: 'string',
          Date: 'string',
          Time: 'string',
          JSON: 'Record<string, any>',
        },
        enumsAsTypes: true,
        skipTypename: true,
        // Use document mode for smaller bundle
        documentMode: 'string',
        eslintDisable: true,
      },
    },
  },
  hooks: {
    afterAllFileWrite: ['prettier --write'],
  },
};

export default config;
