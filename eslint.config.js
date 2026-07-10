import pluginVue from 'eslint-plugin-vue'
import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript'
import skipFormatting from '@vue/eslint-config-prettier/skip-formatting'
import importX from 'eslint-plugin-import-x'

export default defineConfigWithVueTs(
  { name: 'app/files', files: ['**/*.{ts,mts,vue}'] },
  {
    name: 'app/ignores',
    ignores: [
      'dist/**',
      'dist-frame/**',
      'dev-dist/**',
      'coverage/**',
      'vendor/**',
      'node_modules/**',
      // spec-loop process evidence (gate artifacts, playwright reports) — committed but not app source.
      // Prettier already ignores this directory for the same reason.
      'loop/**',
      // Vendored agent skills (impeccable, spec-loop, …): third-party tooling JS, not app source.
      // The harness mirrors the same skill into each agent directory, so lint it in none of them.
      '.claude/**',
      '.agents/**',
      '.github/skills/**',
      // playwright-mcp's output dir (snapshots, console logs, scratch scripts). It is gitignored, but
      // eslint's flat config does not read .gitignore — without this, running the MCP breaks `pnpm lint`.
      '.playwright-mcp/**',
    ],
  },

  pluginVue.configs['flat/essential'],
  vueTsConfigs.recommended,

  // Architecture boundaries (architecture.md → "Directory layout" / "Cross-platform reuse contract").
  // core is the platform-neutral bottom layer; plugins depend on core/contracts, never the reverse.
  {
    name: 'edda/architecture-boundaries',
    plugins: { 'import-x': importX },
    settings: {
      'import-x/resolver': { typescript: true, node: true },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      'import-x/no-restricted-paths': [
        'error',
        {
          zones: [
            {
              target: './src/core',
              from: './src/app',
              message: 'core must not depend on app — core is the platform-neutral bottom layer.',
            },
            {
              target: './src/core',
              from: './src/platform',
              message:
                'core must not depend on platform; reach the platform only through HostBridge.',
            },
            {
              target: './src/core',
              from: './src/plugins',
              message:
                'core must not depend on plugins; plugins depend on core/contracts, never the reverse.',
            },
          ],
        },
      ],
    },
  },

  // Hard rule: core/contracts + core/model are platform-neutral (no DOM, no fetch, no web storage)
  // so the future native client re-implements the identical shape. See architecture.md "Hard rule".
  {
    name: 'edda/platform-neutral-core',
    files: ['src/core/contracts/**/*.ts', 'src/core/model/**/*.ts'],
    rules: {
      'no-restricted-globals': [
        'error',
        { name: 'window', message: 'No DOM in core/contracts or core/model (platform-neutral).' },
        { name: 'document', message: 'No DOM in core/contracts or core/model (platform-neutral).' },
        { name: 'fetch', message: 'No fetch in core — go through HostBridge.http.' },
        {
          name: 'localStorage',
          message: 'No web storage in core — go through HostBridge.storage.',
        },
      ],
    },
  },

  skipFormatting,
)
