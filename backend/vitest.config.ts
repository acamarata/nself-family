import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: ['services/*/src/**/*.ts'],
      exclude: [
        'node_modules/**',
        'dist/**',
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/types/**',
      ],
      // Enforce 100% coverage on changed files
      // In CI, use git diff to determine changed files
      thresholds: {
        lines: 100,
        branches: 100,
        functions: 100,
        statements: 100,
      },
      // Enforce 100% coverage on changed files
      // In CI, use git diff to determine changed files
      all: false,
      lines: 100,
      functions: 100,
      branches: 100,
      statements: 100,
      // Changed file enforcement happens via CI script
      thresholds: {
        lines: 100,
        branches: 100,
        functions: 100,
        statements: 100,
      },
    },
  },
});
