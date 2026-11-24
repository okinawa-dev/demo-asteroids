'use strict';

const js = require('@eslint/js');
const json = require('@eslint/json').default;
const html = require('eslint-plugin-html');
const prettierRecommended = require('eslint-plugin-prettier/recommended');
const globals = require('globals');

module.exports = [
  {
    ignores: [
      'build/**',
      'demo-asteroids.js',
      'assets/**',
      'node_modules/**',
      'package-lock.json',
    ],
  },
  {
    files: ['**/*.js', '**/*.html'],
    ...js.configs.recommended,
    languageOptions: {
      ecmaVersion: 2018,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        Engine: 'readonly',
        engine: 'readonly',
      },
    },
    rules: {
      ...js.configs.recommended.rules,
      'no-console': 'warn',
      'no-debugger': 'warn',
    },
  },
  {
    files: ['**/*.html'],
    plugins: { html },
  },
  {
    files: ['server.js', 'eslint.config.js', '.webpack.config.js'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: globals.node,
    },
  },
  {
    files: ['**/*.json'],
    plugins: { json },
    language: 'json/json',
    rules: json.configs.recommended.rules,
  },
  {
    files: ['**/*.js', '**/*.html', '**/*.json'],
    ...prettierRecommended,
  },
];
