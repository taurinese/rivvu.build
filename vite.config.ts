/// <reference types="vitest/config" />
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const alias = { '@': fileURLToPath(new URL('./src', import.meta.url)) };

/** En-têtes globaux (`/*`) de public/_headers, appliqués aussi par `vite preview` (E2E). */
function globalHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  let inGlobal = false;
  for (const line of readFileSync('public/_headers', 'utf8').split('\n')) {
    if (line.startsWith('#') || line.trim() === '') continue;
    if (!/^\s/.test(line)) inGlobal = line.trim() === '/*';
    else if (inGlobal) {
      const [name = '', ...value] = line.trim().split(':');
      headers[name] = value.join(':').trim();
    }
  }
  return headers;
}

export default defineConfig({
  plugins: [react()],
  resolve: { alias },
  preview: { headers: globalHeaders() },
  test: {
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/main.tsx', 'src/**/*.d.ts'],
      thresholds: {
        lines: 80,
        branches: 80,
        functions: 80,
        statements: 80,
        'src/domain/**': { lines: 95, branches: 95, functions: 95, statements: 95 },
      },
    },
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          environment: 'node',
          include: [
            'src/domain/**/*.test.ts',
            'src/lib/**/*.test.ts',
            'src/app/**/*.test.ts',
            'src/features/**/*.test.ts',
            'src/test/**/*.test.ts',
            'scripts/**/*.test.ts',
          ],
        },
      },
      {
        extends: true,
        test: {
          name: 'data',
          environment: 'node',
          include: ['src/data/**/*.test.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'dom',
          environment: 'jsdom',
          include: ['src/**/*.test.tsx'],
          setupFiles: ['./src/test/setup.ts'],
        },
      },
    ],
  },
});
