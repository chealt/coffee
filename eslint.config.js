import css from '@eslint/css';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';

import importPlugin from 'eslint-plugin-import';

export default defineConfig([
  globalIgnores(['.yarn/*', '.*', '**/dist/*', '**/.astro/*']),
  importPlugin.flatConfigs.recommended,
  // lint CSS files
  {
    files: ['**/*.css'],
    language: 'css/css',
    plugins: { css },
    extends: ['css/recommended'],
    rules: {
      'css/no-invalid-at-rules': 'off',
      'css/no-invalid-properties': 'off'
    }
  },
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser
      }
    },
    rules: {
      'arrow-body-style': ['error'],
      complexity: ['error', 10],
      eqeqeq: ['error'],
      'func-style': ['error'],
      'no-undefined': 'off',
      // recommended
      'array-callback-return': 'error',
      'arrow-spacing': 'error',
      'block-spacing': 'error',
      camelcase: 'error',
      'callback-return': ['error', ['cb', 'callback', 'next']],
      'class-methods-use-this': 'error',
      'consistent-return': 'error',
      'default-case': 'error',
      'dot-notation': ['error', { allowKeywords: true }],
      'guard-for-in': 'error',
      'handle-callback-err': ['error', 'err'],
      'new-cap': 'error',
      'no-alert': 'error',
      'no-array-constructor': 'error',
      'no-buffer-constructor': 'error',
      'no-caller': 'error',
      'no-console': 'error',
      'no-delete-var': 'error',
      'no-else-return': ['error', { allowElseIf: false }],
      'no-eval': 'error',
      'no-extend-native': 'error',
      'no-extra-bind': 'error',
      'no-fallthrough': 'error',
      'no-floating-decimal': 'error',
      'no-global-assign': 'error',
      'no-implied-eval': 'error',
      'no-invalid-this': 'error',
      'no-iterator': 'error',
      'no-label-var': 'error',
      'no-labels': 'error',
      'no-lone-blocks': 'error',
      'no-loop-func': 'error',
      'no-mixed-requires': 'error',
      'no-multi-str': 'error',
      'no-nested-ternary': 'error',
      'no-new': 'error',
      'no-new-func': 'error',
      'no-new-object': 'error',
      'no-new-require': 'error',
      'no-new-wrappers': 'error',
      'no-octal': 'error',
      'no-octal-escape': 'error',
      'no-param-reassign': 'error',
      'no-path-concat': 'error',
      'no-process-exit': 'error',
      'no-proto': 'error',
      'no-redeclare': 'error',
      'no-restricted-properties': [
        'error',
        { property: 'substring', message: 'Use .slice instead of .substring.' },
        { property: 'substr', message: 'Use .slice instead of .substr.' },
        {
          object: 'assert',
          property: 'equal',
          message: 'Use assert.strictEqual instead of assert.equal.'
        },
        {
          object: 'assert',
          property: 'notEqual',
          message: 'Use assert.notStrictEqual instead of assert.notEqual.'
        },
        {
          object: 'assert',
          property: 'deepEqual',
          message: 'Use assert.deepStrictEqual instead of assert.deepEqual.'
        },
        {
          object: 'assert',
          property: 'notDeepEqual',
          message: 'Use assert.notDeepStrictEqual instead of assert.notDeepEqual.'
        }
      ],
      'no-return-assign': 'error',
      'no-script-url': 'error',
      'no-self-assign': 'error',
      'no-self-compare': 'error',
      'no-sequences': 'error',
      'no-shadow': 'error',
      'no-throw-literal': 'error',
      'no-undef': ['error', { typeof: true }],
      'no-undef-init': 'error',
      'no-underscore-dangle': [
        'error',
        {
          allowAfterThis: true,
          allow: ['__REDUX_DEVTOOLS_EXTENSION_COMPOSE__']
        }
      ],
      'no-unmodified-loop-condition': 'error',
      'no-unused-expressions': 'error',
      'no-unused-vars': ['error', { vars: 'all', args: 'after-used' }],
      'no-use-before-define': 'error',
      'no-useless-call': 'error',
      'no-useless-computed-key': 'error',
      'no-useless-concat': 'error',
      'no-useless-constructor': 'error',
      'no-useless-escape': 'error',
      'no-useless-rename': 'error',
      'no-useless-return': 'error',
      'no-var': 'error',
      'object-shorthand': 'error',
      'one-var-declaration-per-line': 'error',
      'operator-assignment': 'error',
      'prefer-arrow-callback': 'error',
      'prefer-const': 'error',
      'prefer-numeric-literals': 'error',
      'prefer-promise-reject-errors': 'error',
      'prefer-rest-params': 'error',
      'prefer-spread': 'error',
      'prefer-template': 'error',
      radix: 'error',
      'require-unicode-regexp': 'error',
      strict: ['error', 'global'],
      'symbol-description': 'error',
      'unicode-bom': 'error',
      'wrap-iife': 'error',
      yoda: ['error', 'never'],
      // import
      'import/default': ['error'],
      'import/export': ['error'],
      'import/group-exports': ['error'],
      'import/named': ['error'],
      'import/namespace': ['error'],
      'import/no-cycle': ['error'],
      'import/no-duplicates': ['error'],
      'import/no-named-as-default-member': ['error'],
      'import/no-named-as-default': ['error'],
      'import/no-unresolved': ['off'],
      'import/order': [
        'error',
        {
          alphabetize: {
            order: 'asc'
          },
          'newlines-between': 'always',
          groups: ['external', 'internal'],
          pathGroups: [
            {
              pattern: '{.,..}/**/*.css',
              group: 'index',
              position: 'after'
            }
          ]
        }
      ],
      'import/no-extraneous-dependencies': ['error', { devDependencies: true }]
    }
  },
  {
    files: [
      'packages/coffee.chealt.com/data/**/*.js',
      'packages/coffee.chealt.com/astro.config.js',
      'packages/coffee.chealt.com/src/server/**/*.js',
      'packages/coffee.chealt.com/src/middleware.js'
    ],
    languageOptions: {
      globals: {
        ...globals.node
      }
    }
  }
]);
