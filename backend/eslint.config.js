const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.node,
      },
    },
    rules: {
      'no-console': process.env.NODE_ENV === 'production' ? 'error' : 'warn',
      'no-unused-vars': ['warn', { 
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_'
      }],
      'indent': ['error', 2],
      'quotes': ['error', 'single'],
      'semi': ['error', 'always']
    },
    ignores: [
      'node_modules/',
      'dist/',
      'public/'
    ]
  },
  // Override for test files
  {
    files: ['test/**/*.js'],
    languageOptions: {
      globals: {
        ...globals.jest, // or globals.mocha if you're using Mocha
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        afterAll: 'readonly'
      }
    }
  }
];
