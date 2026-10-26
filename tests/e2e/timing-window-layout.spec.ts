import { test, expect } from '@playwright/test';
import { mockSheet } from './helpers';

test('timing panel omits hypothesis shading and retains the game-clock marker', async ({
  page,
}) => {
  await mockSheet(page);
  await page.goto('/');
  const panel = page.locator('.timing-grid > .panel').first();
  const plot = panel.locator('.js-plotly-plot');
  await expect(plot.locator('.xtitle')).toBeVisible();
  await expect.soft(panel).not.toContainText('Hypothesis');
  const shapes = () =>
    plot.evaluate((node) => {
      const g = node as unknown as {
        layout: { shapes: { type: string; x0: number; x1: number }[] };
      };
      return g.layout.shapes.map(({ type, x0, x1 }) => ({ type, x0, x1 }));
    });
  expect.soft(await shapes()).toEqual([{ type: 'line', x0: 15, x1: 15 }]);
  await page.getByRole('slider', { name: 'Game clock', exact: true }).press('Home');
  await expect.poll(shapes).toEqual([{ type: 'line', x0: 12, x1: 12 }]);
  await page.getByLabel('Timing basis').selectOption('observed');
  await expect(panel.getByRole('heading')).toHaveText('Modeled timing window');
  await expect(panel).not.toContainText('Hypothesis');
  expect(await shapes()).toEqual([{ type: 'line', x0: 12, x1: 12 }]);
});

for (const width of [1440, 1920])
  test(`timing chart fills its panel at width ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1080 });
    await mockSheet(page);
    await page.goto('/');
    const panel = page.locator('.timing-grid > .panel').first();
    const plot = panel.locator('.js-plotly-plot');
    await expect(plot.locator('.xtitle')).toBeVisible();
    const expectFilled = async () => {
      await expect
        .poll(() =>
          plot.evaluate((node) => {
            const panel = node.closest('.panel')!;
            const style = getComputedStyle(panel);
            const bottomGap =
              panel.getBoundingClientRect().bottom -
              parseFloat(style.borderBottomWidth) -
              parseFloat(style.paddingBottom) -
              node.getBoundingClientRect().bottom;
            return Math.max(
              Math.abs(bottomGap),
              Math.abs(
                node.getBoundingClientRect().height -
                  node.querySelector('.main-svg')!.getBoundingClientRect().height,
              ),
            );
          }),
        )
        .toBeLessThanOrEqual(2);
      const bounds = await plot.boundingBox();
      expect(bounds!.height).toBeGreaterThanOrEqual(300);
      return bounds!.height;
    };
    const collapsedHeight = await expectFilled();
    await page.locator('.os-view .os-fit-details summary').click();
    expect(await expectFilled()).toBeGreaterThan(collapsedHeight);
    await page.locator('.os-view .os-fit-details summary').click();
    await expectFilled();
    await page.getByLabel('Role', { exact: true }).selectOption('Tech');
    await expectFilled();
    await page.setViewportSize({ width: width === 1440 ? 1920 : 1440, height: 1080 });
    await expectFilled();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      page.viewportSize()!.width,
    );
  });

test('mobile timing axis titles remain fully inside the chart', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockSheet(page);
  await page.goto('/');
  const plot = page.locator('.timing-grid .js-plotly-plot').first();
  for (const basis of ['modeled', 'observed']) {
    await page.getByLabel('Timing basis').selectOption(basis);
    await expect(plot.locator('.ytitle')).toBeVisible();
    await expect
      .poll(() =>
        plot.evaluate((node) => {
          const chart = node.getBoundingClientRect();
          return Math.max(
            ...[...node.querySelectorAll('.xtitle, .ytitle')].flatMap((title) => {
              const bounds = title.getBoundingClientRect();
              return [
                chart.top - bounds.top,
                bounds.bottom - chart.bottom,
                chart.left - bounds.left,
                bounds.right - chart.right,
              ];
            }),
          );
        }),
      )
      .toBeLessThanOrEqual(0);
  }
});
