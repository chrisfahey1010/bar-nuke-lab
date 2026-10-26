import { test, expect } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { mockSheet } from './helpers';
for (const [width, height] of [
  [1440, 900],
  [1920, 1080],
  [390, 844],
])
  test(`responsive viewport ${width}x${height} and nondefault placeholder-duration state`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height });
    await mockSheet(page);
    await page.goto('/');
    await expect(page.locator('.js-plotly-plot')).toHaveCount(4);
    const metrics = await page.evaluate(() => ({
      viewport: { width: innerWidth, height: innerHeight },
      documentWidth: document.documentElement.scrollWidth,
      documentHeight: document.documentElement.scrollHeight,
      chart: document.querySelector('.timing-grid')?.getBoundingClientRect().toJSON(),
      controls: [
        ...document.querySelectorAll('.filterbar input,.filterbar select,.clock-controls select'),
      ].map((n) => ({
        name: n.getAttribute('aria-label') ?? n.closest('label')?.textContent,
        bounds: n.getBoundingClientRect().toJSON(),
      })),
    }));
    expect(metrics.documentWidth).toBeLessThanOrEqual(width + 1);
    if (width >= 1440) expect(metrics.chart!.bottom).toBeLessThanOrEqual(height);
    mkdirSync('docs/screenshots', { recursive: true });
    mkdirSync('docs/verification', { recursive: true });
    writeFileSync(`docs/verification/layout-${width}.json`, JSON.stringify(metrics, null, 2));
    await page.screenshot({
      path: `docs/screenshots/default-${width}x${height}.png`,
      fullPage: false,
    });
    await page.getByLabel('Role', { exact: true }).selectOption('Air');
    await page.getByLabel('OS maximum').fill('20');
    await page.getByLabel('Game', { exact: true }).selectOption('1');
    await expect(page.getByRole('region', { name: 'Ongoing-game estimates' })).toContainText(
      '50.0%',
    );
    await expect(page.getByTestId('denominator')).toContainText('own N=2');
    await expect(page.getByTestId('denominator')).toContainText('1 placeholder endpoints (30:00)');
    const clock = page.getByRole('slider', { name: 'Game clock', exact: true });
    await clock.focus();
    await clock.press('End');
    await expect(clock).toHaveValue('1500');
    await expect(page.getByRole('region', { name: 'Ongoing-game estimates' })).toContainText(
      '50.0%',
    );
    await expect(page.getByTestId('denominator')).toContainText('own N=2');
    await clock.press('Home');
    await expect(clock).toHaveValue('720');
    await expect(page.locator('.js-plotly-plot')).toHaveCount(2);
    await page.screenshot({
      path: `docs/screenshots/air-placeholder-duration-${width}x${height}.png`,
      fullPage: false,
    });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      width + 1,
    );
  });
