import { test, expect } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { mockSheet } from './helpers';

for (const width of [1440, 1920, 1024, 751, 750, 390])
  test(`source evidence stays inside records with full-width analysis at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 1080 });
    await mockSheet(page);
    await page.goto('/');
    await expect(page.getByTestId('player-count')).toHaveText('67');
    const records = page.locator('.record-table-region');
    const evidence = records.getByRole('complementary', { name: 'Selected record evidence' });
    await expect(evidence).toHaveCount(1);

    for (const view of ['Timing Window', 'OS Relationship', 'Match Timeline', 'Data Explorer']) {
      await page.getByRole('tab', { name: view, exact: true }).click();
      const analysis = (await page.locator('#analysis').boundingBox())!;
      const grid = (await page.locator('.dashboard-grid').boundingBox())!;
      expect(Math.abs(analysis.x - grid.x)).toBeLessThanOrEqual(1);
      expect(Math.abs(analysis.width - grid.width)).toBeLessThanOrEqual(1);
      const region = (await records.boundingBox())!;
      const table = (await records.locator('.table-scroll').boundingBox())!;
      const detail = (await evidence.boundingBox())!;
      expect(detail.x).toBeGreaterThanOrEqual(region.x);
      expect(detail.x + detail.width).toBeLessThanOrEqual(region.x + region.width);
      if (width > 750) {
        expect(detail.x).toBeGreaterThanOrEqual(table.x + table.width + 12);
        expect(detail.y).toBeLessThan(table.y + table.height);
      } else {
        const pagination = (await records.locator('.pagination').boundingBox())!;
        expect(detail.y).toBeGreaterThanOrEqual(pagination.y + pagination.height);
        expect(Math.abs(detail.width - table.width)).toBeLessThanOrEqual(1);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
        width,
      );
    }

    await records.getByRole('button', { name: 'Inspect source row 5', exact: true }).click();
    await expect(
      evidence.getByRole('heading', { name: 'Selected record', exact: true }),
    ).toBeFocused();
    await expect(evidence.locator('.record-identity')).toContainText('Game 1 · Tech');
    await evidence.getByText('All raw fields & validation', { exact: true }).click();
    await expect(evidence.locator('details[open]')).toContainText('AN built time');
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      width,
    );

    if (width === 1440 || width === 390) {
      const mode = testInfo.project.use.baseURL?.includes('4173') ? 'preview' : 'dev';
      mkdirSync('docs/screenshots', { recursive: true });
      mkdirSync('docs/verification', { recursive: true });
      writeFileSync(
        `docs/verification/evidence-layout-fixture-${mode}-${width}.json`,
        JSON.stringify(
          {
            viewport: page.viewportSize(),
            analysis: await page.locator('#analysis').boundingBox(),
            records: await records.boundingBox(),
            table: await records.locator('.table-scroll').boundingBox(),
            evidence: await evidence.boundingBox(),
            documentWidth: await page.evaluate(() => document.documentElement.scrollWidth),
          },
          null,
          2,
        ),
      );
      await evidence.getByText('All raw fields & validation', { exact: true }).click();
      await records.screenshot({
        path: `docs/screenshots/evidence-layout-fixture-${mode}-${width}.png`,
      });
    }
  });
