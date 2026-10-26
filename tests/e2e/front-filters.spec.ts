import { test, expect } from '@playwright/test';
import { mockSheet } from './helpers';
import { csvOf, fullRows } from '../fixtures/helpers';

test('shared front selector precedes AN type, filters all views, resets selection and preserves allied context', async ({
  page,
}) => {
  const rows = fullRows('TEST-ONLY-front-filter');
  const tech = rows.find((r) => r.Position === 'Tech' && r['Team ID'] === '1')!;
  tech['Front situation upon AN build'] = 'Disadvantage';
  tech['Other positions covered'] = 'Geo';
  const advantage = rows.find((r) => r.Position === 'Geo' && r['Team ID'] === '1')!;
  advantage['AN built time'] = '14:00';
  advantage['AN Type'] = 'Citadel';
  advantage['Front situation upon AN build'] = ' advantage ';
  const equal = rows.find((r) => r.Position === 'Geo' && r['Team ID'] === '2')!;
  equal['AN built time'] = '13:00';
  equal['Front situation upon AN build'] = 'EQUAL';
  await mockSheet(page, csvOf(rows));
  await page.goto('/');
  const front = page.getByLabel('Front situation', { exact: true });
  await expect(front).toHaveValue('');
  await expect(front.locator('option')).toHaveText([
    'All situations',
    'Advantage',
    'Equal',
    'Disadvantage',
  ]);
  const order = await page
    .locator('.filterbar select')
    .evaluateAll((nodes) => nodes.map((node) => node.getAttribute('aria-label')));
  expect(order.indexOf('Front situation')).toBe(order.indexOf('AN type') - 1);
  const frontBox = await front.boundingBox();
  const typeBox = await page.getByLabel('AN type', { exact: true }).boundingBox();
  expect(frontBox!.x + frontBox!.width).toBeLessThan(typeBox!.x);
  await page.locator('.keyboard-selection summary').click();
  const linked = page.getByLabel('Linked row selection');
  const ref = await linked
    .locator('option')
    .filter({ hasText: 'Team 2 · Geo' })
    .getAttribute('value');
  await linked.selectOption(ref!);
  await expect(page.getByTestId('player-count')).toHaveText('1');
  await front.selectOption('Advantage');
  await expect(page.getByRole('button', { name: 'Clear linked selection' })).toHaveCount(0);
  await expect(page.getByTestId('player-count')).toHaveText('1');
  await expect(page.getByTestId('denominator')).toContainText('labeled observations only');
  await expect(page.getByTestId('denominator')).toContainText('own N=1; coverage N=1');
  const cards = page.locator('.summary-strip .rate-card strong');
  await expect(cards.nth(0)).toContainText('0.0%');
  await expect(cards.nth(1)).toContainText('100.0%');
  const readiness = page.locator('.timing-panel .js-plotly-plot');
  await expect
    .poll(() =>
      readiness.evaluate((node) =>
        (node as unknown as { data: { name: string; y: number[] }[] }).data.map((trace) => ({
          name: trace.name,
          percentage: trace.y[180],
        })),
      ),
    )
    .toEqual([{ name: 'Geo · recorded target coverage', percentage: 100 }]);
  await expect(page.locator('.front-situation-panel').getByTestId('front-point-count')).toHaveText(
    '1',
  );
  await expect(page.getByTestId('records-table').locator('tbody tr')).toHaveCount(1);
  await expect(page.locator('.record-identity')).toContainText('Geo');
  await expect(page.locator('.providers')).toContainText('Tech');
  await page.getByRole('tab', { name: 'OS Relationship', exact: true }).click();
  await expect
    .poll(() =>
      page
        .locator('.os-view .js-plotly-plot')
        .evaluate(
          (node) =>
            (node as unknown as { data: { customdata?: string[] }[] }).data.flatMap(
              (trace) => trace.customdata ?? [],
            ).length,
        ),
    )
    .toBe(1);
  await page.getByRole('tab', { name: 'Match Timeline', exact: true }).click();
  await expect(page.locator('.timeline')).toContainText('1 selected target rows highlighted');
  await expect(page.locator('.timeline')).toContainText('All 16 match-context lanes retained');
  await page.getByRole('tab', { name: 'Data Explorer', exact: true }).click();
  await expect(page.getByTestId('records-table').locator('tbody tr')).toHaveCount(1);
  for (const situation of ['Equal', 'Disadvantage']) {
    await front.selectOption(situation);
    await expect(page.getByTestId('player-count')).toHaveText('1');
    await expect(page.locator('.record-stats')).toContainText(
      situation === 'Equal' ? 'EQUAL' : situation,
    );
  }
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await expect(front).toHaveValue('');
  await expect(page.getByTestId('player-count')).toHaveText('16');
  await expect(page.getByTestId('denominator')).not.toContainText('labeled observations only');
});
