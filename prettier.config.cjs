/** @type {import("prettier").Config} */
module.exports = {
  tabWidth: 2,
  printWidth: 90,
  semi: true,
  useTabs: false,
  bracketSpacing: true,
  bracketSameLine: true,
  singleQuote: true,
  jsxSingleQuote: false,
  singleAttributePerLine: false,
  arrowParens: 'always',
  trailingComma: 'es5',
  plugins: ['@trivago/prettier-plugin-sort-imports', 'prettier-plugin-tailwindcss'],
};
