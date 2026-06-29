// Flat config (ESLint v9). Type-aware lint via typescript-eslint projectService.
// Formatting is owned by Prettier — eslint-config-prettier (last) disables conflicting rules.
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: ['dist/', 'node_modules/', 'coverage/'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ['eslint.config.js'],
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    // Aligns with .claude/skills/backend-conventions: explicit return types, no floating
    // promises, guard clauses. Behavioral laws stay in AGENTS.md; these are the lintable subset.
    rules: {
      '@typescript-eslint/explicit-function-return-type': [
        'warn',
        { allowExpressions: true, allowTypedFunctionExpressions: true },
      ],
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/consistent-type-imports': 'warn',
      eqeqeq: ['error', 'smart'],
    },
  },
  {
    // Plain JS/MJS (eslint config, Node build scripts) are not in the TS program — drop
    // type-aware rules and give them Node globals.
    files: ['**/*.{js,mjs,cjs}'],
    ...tseslint.configs.disableTypeChecked,
    languageOptions: {
      ...tseslint.configs.disableTypeChecked.languageOptions,
      globals: globals.node,
    },
    rules: {
      ...tseslint.configs.disableTypeChecked.rules,
      // Build scripts don't need annotated return types.
      '@typescript-eslint/explicit-function-return-type': 'off',
    },
  },
  prettier,
);
