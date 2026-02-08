import { defineConfig } from 'vitest/config';
import { crx } from '@crxjs/vite-plugin';
import { resolve } from 'path';
import { cpSync, mkdirSync, readFileSync, writeFileSync, rmSync, mkdtempSync } from 'fs';
import { tmpdir } from 'os';

import manifest from './src/manifest.json';

const build = () => {
  return {
    name: 'cross-browser-build',
    apply: 'build',
    closeBundle() {
      const distDir = resolve(__dirname, 'dist');
      const tmpDir = mkdtempSync(resolve(tmpdir(), 'promptguard-'));

      cpSync(distDir, tmpDir, { recursive: true });
      rmSync(distDir, { recursive: true });
      mkdirSync(distDir);

      const chromeDir = resolve(distDir, 'chrome');
      const firefoxDir = resolve(distDir, 'firefox');

      cpSync(tmpDir, chromeDir, { recursive: true });
      cpSync(tmpDir, firefoxDir, { recursive: true });
      rmSync(tmpDir, { recursive: true });

      // Patch Firefox manifest
      const manifestPath = resolve(firefoxDir, 'manifest.json');
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));

      manifest.browser_specific_settings = {
        gecko: {
          id: 'promptguard@wicker25',
          strict_min_version: '128.0',
          data_collection_permissions: { required: ['none'] },
        },
      };

      if (manifest.background?.service_worker) {
        const script = manifest.background.service_worker;
        manifest.background = { scripts: [script], type: 'module' };
      }

      if (manifest.web_accessible_resources) {
        manifest.web_accessible_resources = manifest.web_accessible_resources.map(
          ({ use_dynamic_url: _, ...rest }: Record<string, unknown>) => rest
        );
      }

      writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    },
  };
};

export default defineConfig({
  // @ts-ignore
  plugins: [crx({ manifest }), build()],
  root: 'src',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  test: {
    globals: true,
  },
});
