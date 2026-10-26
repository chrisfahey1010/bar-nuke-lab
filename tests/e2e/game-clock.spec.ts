import { test, expect } from '@playwright/test';
import { mockSheet } from './helpers';

for (const width of [1440, 390])
  test(`game clock spans 12:00–25:00 with one-second steps at width ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await mockSheet(page);
    await page.goto('/');
    const clock = page.getByRole('slider', { name: 'Game clock', exact: true });
    const display = page.locator('output[for="game-clock"]');
    await expect(clock).toHaveAttribute('min', '720');
    await expect(clock).toHaveAttribute('max', '1500');
    await expect(clock).toHaveAttribute('step', '1');
    await expect(clock).toHaveValue('900');
    await expect(display).toHaveText('15:00');

    await clock.focus();
    await clock.press('Home');
    await expect(clock).toHaveValue('720');
    await expect(display).toHaveText('12:00');
    await clock.press('ArrowLeft');
    await expect(clock).toHaveValue('720');
    await clock.press('ArrowRight');
    await expect(clock).toHaveValue('721');
    await expect(display).toHaveText('12:01');

    await clock.press('End');
    await expect(clock).toHaveValue('1500');
    await expect(display).toHaveText('25:00');
    await clock.press('ArrowRight');
    await expect(clock).toHaveValue('1500');
    await clock.press('ArrowLeft');
    await expect(clock).toHaveValue('1499');
    await expect(display).toHaveText('24:59');
  });
