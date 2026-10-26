import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseConfigFileTextToJson } from 'typescript';

const readJson = (path: string) => {
  const parsed = parseConfigFileTextToJson(path, readFileSync(path, 'utf8'));
  if (parsed.error) throw new Error(`Invalid JSON/JSONC in ${path}`);
  return parsed.config;
};

describe('Workers deployment contract', () => {
  it('serves only the Vite output with explicit SPA routing', () => {
    const config = readJson('wrangler.jsonc');
    expect(config.name).toBe('bar-nuke-lab');
    expect(config.compatibility_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(config.assets).toEqual({
      directory: './dist',
      not_found_handling: 'single-page-application',
    });
    expect(config.main).toBeUndefined();
  });

  it('does not introduce credentials, server bindings, or DNS routes', () => {
    const config = readJson('wrangler.jsonc');
    for (const key of ['account_id', 'route', 'routes', 'vars', 'kv_namespaces', 'd1_databases']) {
      expect(config[key], key).toBeUndefined();
    }
    expect(config.workers_dev).toBe(true);
    expect(config.send_metrics).toBe(false);
  });

  it('pins deployment tooling and keeps verification non-deploying', () => {
    const pkg = readJson('package.json');
    expect(pkg.devDependencies.wrangler).toMatch(/^\d+\.\d+\.\d+$/);
    expect(pkg.scripts.check).toBe('npm run test && npm run build && npm run deploy:check');
    expect(pkg.scripts['deploy:check']).toBe(
      'wrangler deploy --dry-run --outdir .wrangler/dry-run',
    );
    expect(pkg.private).toBe(true);
    expect(readFileSync('.nvmrc', 'utf8').trim()).toBe('22.23.0');
  });

  it('keeps the emulator HTTP-client security override effective in the lockfile', () => {
    const pkg = readJson('package.json');
    const lock = readJson('package-lock.json');
    const miniflare = lock.packages['node_modules/miniflare'].version;
    expect(pkg.overrides[`miniflare@${miniflare}`]?.undici).toBe('7.30.1');
    expect(lock.packages['node_modules/undici'].version).toBe('7.30.1');
  });

  it('ships baseline browser security headers with the static output', () => {
    const headers = readFileSync('public/_headers', 'utf8');
    for (const value of [
      'X-Content-Type-Options: nosniff',
      'X-Frame-Options: DENY',
      'Referrer-Policy: strict-origin-when-cross-origin',
      "frame-ancestors 'none'",
      "object-src 'none'",
    ]) {
      expect(headers).toContain(value);
    }
  });
});
