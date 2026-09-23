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
];
