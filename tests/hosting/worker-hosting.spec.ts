import { test, expect } from '@playwright/test';
import { readFileSync, readdirSync } from 'node:fs';
import { mockSheet } from '../e2e/helpers';

const indexHtml = () => readFileSync('dist/index.html', 'utf8');

test('Worker serves the production shell with baseline security headers', async ({ request }) => {
  const response = await request.get('/');
  expect(response.status()).toBe(200);
  expect(await response.text()).toBe(indexHtml());
  expect(response.headers()['content-type']).toContain('text/html');
  expect(response.headers()['x-content-type-options']).toBe('nosniff');
  expect(response.headers()['x-frame-options']).toBe('DENY');
  expect(response.headers()['referrer-policy']).toBe('strict-origin-when-cross-origin');
  expect(response.headers()['content-security-policy']).toContain("frame-ancestors 'none'");
  expect(response.headers()['permissions-policy']).toContain('camera=()');
});

test('Worker serves every emitted JavaScript and CSS asset byte-for-byte', async ({ request }) => {
  const files = readdirSync('dist/assets');
  expect(files.length).toBeGreaterThan(0);
  for (const file of files) {
    const response = await request.get(`/assets/${file}`);
    expect(response.status(), file).toBe(200);
    expect(await response.body(), file).toEqual(readFileSync(`dist/assets/${file}`));
    expect(response.headers()['x-content-type-options'], file).toBe('nosniff');
    expect(response.headers()['content-type'], file).toMatch(
      file.endsWith('.css') ? /text\/css/ : /javascript/,
    );
  }
});

test('Worker does not expose repository files or the header rules as assets', async ({
  request,
}) => {
  for (const path of [
    '/.git/config',
    '/package.json',
    '/.env',
    '/docs/data-contract.md',
    '/_headers',
  ]) {
    const response = await request.get(path);
    expect([200, 404], path).toContain(response.status());
    // An unknown path may return the SPA shell, never the repository file.
    if (response.status() === 200) expect(await response.text(), path).toBe(indexHtml());
  }
});

test('Worker supports direct SPA navigation and reload with functioning plots', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await mockSheet(page);
  await page.goto('/deployment-check/deep-link');
  await expect(page.getByRole('tab', { name: 'Timing Window', exact: true })).toBeVisible();
  await expect(page.locator('.js-plotly-plot')).toHaveCount(4);
  await expect(page.getByTestId('player-count')).toHaveText('67');
  await page.reload();
  await expect(page.locator('.js-plotly-plot')).toHaveCount(4);
  expect(errors).toEqual([]);
});
