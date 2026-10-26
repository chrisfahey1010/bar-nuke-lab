import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mockSheet } from './helpers';
for (const view of ['Timing Window', 'OS Relationship', 'Match Timeline', 'Data Explorer'])
  test(`accessible ${view} view and methodology dialog`, async ({ page }) => {
    await mockSheet(page);
    await page.goto('/');
    await expect(page.getByTestId('player-count')).toHaveText('67');
    await page.getByRole('tab', { name: view, exact: true }).click();
    if (view !== 'Data Explorer')
      await expect(page.locator('.js-plotly-plot').first()).toBeVisible();
    const result = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(result.violations).toEqual([]);
    await page.getByRole('button', { name: 'Methodology', exact: true }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    expect(
      (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
        .violations,
    ).toEqual([]);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Methodology', exact: true })).toBeFocused();
  });
test('keyboard tabs, skip link, record focus and linked selection work', async ({ page }) => {
  await mockSheet(page);
  await page.goto('/');
  await expect(page.getByTestId('player-count')).toHaveText('67');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to analysis' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#analysis')).toBeFocused();
  await page.getByRole('tab', { name: 'Timing Window', exact: true }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: 'OS Relationship' })).toBeFocused();
  await expect(page.getByRole('tab', { name: 'OS Relationship' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await page.getByRole('tab', { name: 'Data Explorer' }).click();
  await page.getByRole('button', { name: 'Inspect source row 5', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Selected record', exact: true })).toBeFocused();
  await page.getByText('Keyboard chart selection', { exact: true }).click();
  await page
    .getByLabel('Linked row selection', { exact: true })
    .selectOption(['Sheet1!A5:P5', 'Sheet1!A37:P37']);
  await expect(page.getByTestId('player-count')).toHaveText('2');
  await expect(page.getByTestId('records-table').locator('tbody tr')).toHaveCount(2);
  await page.getByRole('button', { name: 'Clear linked selection' }).click();
  await expect(page.getByTestId('player-count')).toHaveText('67');
});
