import { test, expect } from '@playwright/test';
import { mockSheet } from './helpers';
test('timeline groups explicit teams and shows opening double-salvo evidence, not later campaign analytics', async ({
  page,
}) => {
  await mockSheet(page);
  await page.goto('/');
  await expect(page.getByTestId('player-count')).toHaveText('67');
  await page.getByLabel('Game', { exact: true }).selectOption('3');
  await page.getByRole('tab', { name: 'Match Timeline' }).click();
  await expect(
    page.getByRole('heading', { name: 'Match and opening-strike timeline' }),
  ).toBeVisible();
  await expect(page.getByTestId('team-groups')).toContainText('Team 1: 8');
  await expect(page.getByTestId('team-groups')).toContainText('Team 2: 8');
  await page.getByRole('button', { name: /Team 2.*20:30/ }).click();
  await expect(page.getByTestId('opening-evidence')).toContainText(
    'Double nuke on tech + air won game, instant surrender',
  );
  await expect(page.getByTestId('opening-evidence')).toContainText(
    'Launch-time snapshot, not impact',
  );
  await expect(page.getByTestId('opening-evidence')).toContainText('Legacy count(s): 2');
  await page.getByLabel('Game', { exact: true }).selectOption('5');
  await expect(page.getByTestId('team-groups')).toContainText('Unknown: 5');
  await page.getByLabel('Game', { exact: true }).selectOption('7');
  await expect(page.getByLabel('Replay reference', { exact: true })).toHaveValue(
    '2026-09-30_05-37-01-275_Supreme Isthmus v2.1_2026.07.04',
  );
  await expect(page.getByRole('button', { name: /Play replay/ })).toHaveCount(0);
});
