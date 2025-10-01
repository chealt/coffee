export default {
  plugins: ['prettier-plugin-astro', 'prettier-plugin-sql'],
  overrides: [
    {
      files: '*.astro',
      options: {
        parser: 'astro'
      }
    }
  ],
  semi: true,
  singleQuote: true,
  trailingComma: 'none',
  arrowParens: 'always',
  printWidth: 120,
  tabWidth: 2,
  useTabs: false,
  bracketSpacing: true
};
