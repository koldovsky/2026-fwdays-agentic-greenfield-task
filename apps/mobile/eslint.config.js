// Flat ESLint config for @honeydo/mobile. Intentionally minimal: its job is to
// guard the design-system rule that app code uses tokens, never raw hex
// (FR-THEME-03, DESIGN.md). The typed theme in src/theme/ is the one place hex
// values are allowed — it is the source the tokens are ported into.
const tseslint = require('typescript-eslint');

const HEX_LITERAL = 'Literal[value=/#[0-9a-fA-F]{3,8}/]';

module.exports = tseslint.config(
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      '.expo/**',
      'ios/**',
      'android/**',
      'babel.config.js',
      'metro.config.js',
      'eslint.config.js',
    ],
  },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tseslint.parser,
    },
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: HEX_LITERAL,
          message:
            'No raw hex colors in app code — use design tokens from src/theme (FR-THEME-03, DESIGN.md).',
        },
      ],
    },
  },
  {
    // The token definitions are the sanctioned home for raw hex values.
    files: ['src/theme/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': 'off',
    },
  },
);
