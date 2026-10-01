import { fixupPluginRules } from '@eslint/compat';
import prettierConfig from './prettier.config.mjs';
import eslintPluginJsxA11y from 'eslint-plugin-jsx-a11y';
import eslintPluginPrettier from 'eslint-plugin-prettier';
import eslintPluginReact from 'eslint-plugin-react';
import eslintPluginReactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

export default [
  {
    files: ['**/*.ts', '**/*.tsx'],
    ignores: ['!**/.server', '!**/.client', 'remix.init/*', 'public/js/elk-worker.min.js'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: './tsconfig.json',
        sourceType: 'module',
        ecmaVersion: 'latest',
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin,
      react: fixupPluginRules(eslintPluginReact),
      'react-hooks': fixupPluginRules(eslintPluginReactHooks),
      // import: eslintPluginImport,
      'jsx-a11y': fixupPluginRules(eslintPluginJsxA11y),
      prettier: eslintPluginPrettier,
    },
    rules: {
      ...tseslint.configs.recommendedTypeChecked[0].rules,
      ...eslintPluginReact.configs.recommended.rules,
      ...eslintPluginReactHooks.configs.recommended.rules,
      ...eslintPluginPrettier.configs.recommended.rules,
      'prettier/prettier': ['error', prettierConfig],
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off', // Disable prop-types since we use TypeScript
      // Keep text sizes on the datum-ui type scale (Storybook → Docs/Type
      // Scale). An arbitrary size can't be retuned with the scale, and a raw
      // size class on a plain element is body text that belongs in <Text>.
      // Size overrides on components (Badge, Chip, TableCell, …) are that
      // component's own scale and stay allowed.
      'no-restricted-syntax': [
        'error',
        {
          selector:
            'JSXAttribute[name.name="className"] Literal[value=/text-\\[[0-9.]+(px|rem)\\]/]',
          message:
            'Arbitrary text size. Use a named step from the type scale (text-5xs … text-8xl) so a change to the scale reaches this too.',
        },
        {
          selector:
            'JSXOpeningElement[name.name=/^(span|p|div|h[1-6])$/] > JSXAttribute[name.name="className"] Literal[value=/(^|\\s)text-(5xs|4xs|3xs|2xs|xs|sm|base|lg|xl|[2-9]xl)($|\\s)/]',
          message:
            'Raw text size on a plain element. Render body text with <Text> / <Paragraph> / <Title> from @datum-cloud/datum-ui/typography, which takes the size as a prop.',
        },
        {
          selector:
            'CallExpression[callee.name=/^generate(Query|Mutation)Op$/] > ObjectExpression.arguments:not(:has(> Property[key.name="__name"]))',
          message:
            'Unnamed GraphQL operation — the gateway traces it as "Anonymous", so slow queries can\'t be attributed to a view. Pass __name, e.g. generateQueryOp({ __name: "StaffFoo", ... }). See #688.',
        },
      ],
      // 'import/order': [
      //   'warn',
      //   {
      //     groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
      //     'newlines-between': 'never',
      //   },
      // ],
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
  },
  {
    // GraphQL layering guard (#690). Base rule: forbid BOTH the raw genql builder
    // and runGqlQuery everywhere, so the api/UI tiers call ops, not the gql
    // primitives. The two overrides below re-allow each where it belongs. (These
    // must share one `no-restricted-imports` per file — in flat config a later
    // config REPLACES, not merges, a rule it also sets.) See
    // docs/engineering/04-data-and-requests.md.
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@/modules/graphql/generated',
              importNames: ['generateQueryOp', 'generateMutationOp'],
              message:
                'Build GraphQL operations with runGqlQuery in resources/gql/*.gql.ts, not the raw genql builder. See #690 / docs/engineering/04-data-and-requests.md.',
            },
            {
              name: '@/modules/graphql/client',
              importNames: ['runGqlQuery'],
              message:
                'Define GraphQL operations in resources/gql/*.gql.ts; the api layer calls those ops, not runGqlQuery directly. See #690 / docs/engineering/04-data-and-requests.md.',
            },
          ],
        },
      ],
    },
  },
  {
    // The ops layer may call runGqlQuery (but still not the raw genql builder).
    files: ['app/resources/gql/*.gql.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@/modules/graphql/generated',
              importNames: ['generateQueryOp', 'generateMutationOp'],
              message:
                'Build GraphQL operations with runGqlQuery, not the raw genql builder. See #690 / docs/engineering/04-data-and-requests.md.',
            },
          ],
        },
      ],
    },
  },
  {
    // The runGqlQuery helper + generated code are the primitives themselves.
    files: ['app/modules/graphql/client.ts', 'app/modules/graphql/generated/**'],
    rules: { 'no-restricted-imports': 'off' },
  },
];
