import { test, expect, type Locator } from '@playwright/test';
import { mockSheet } from './helpers';

async function endpoints(plot: Locator) {
  return plot.evaluate((node) => {
    const chart = node.getBoundingClientRect();
    const g = node as unknown as {
      _fullLayout: { xaxis: { range: number[]; _offset: number; l2p: (value: number) => number } };
    };
    return {
      range: g._fullLayout.xaxis.range,
      x: [12, 25].map(
        (value) => chart.left + g._fullLayout.xaxis._offset + g._fullLayout.xaxis.l2p(value),
      ),
      svgWidth: node.querySelector('.main-svg')!.getBoundingClientRect().width,
      chartWidth: chart.width,
    };
  });
}

for (const width of [1440, 1920, 390])
  test(`front panel matches timing width and plotted 12:00–25:00 endpoints at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1080 });
    await mockSheet(page);
    await page.goto('/');
    const timing = page.locator('.timing-panel');
    const front = page.locator('.front-situation-panel');
    const timingPlot = timing.locator('.js-plotly-plot');
    const frontPlot = front.locator('.js-plotly-plot');
    await expect(frontPlot.locator('.xtitle')).toBeVisible();
    const panelBounds = await timing.boundingBox();
    const frontBounds = await front.boundingBox();
    expect(Math.abs(panelBounds!.width - frontBounds!.width)).toBeLessThanOrEqual(1);
    expect(Math.abs(panelBounds!.x - frontBounds!.x)).toBeLessThanOrEqual(1);
    const verifyAxes = async () => {
      await expect
        .poll(async () => {
          const a = await endpoints(timingPlot);
          const b = await endpoints(frontPlot);
          return Math.max(
            ...a.x.map((x, i) => Math.abs(x - b.x[i])),
            Math.abs(a.svgWidth - a.chartWidth),
            Math.abs(b.svgWidth - b.chartWidth),
          );
        })
        .toBeLessThanOrEqual(1);
      expect((await endpoints(frontPlot)).range).toEqual([12, 25]);
      for (const text of ['12:00', '25:00']) {
        const label = frontPlot.locator('.xtick text').filter({ hasText: text });
        await expect(label).toBeVisible();
        const labelBounds = await label.boundingBox();
        const chartBounds = await frontPlot.boundingBox();
        expect(labelBounds!.width).toBeGreaterThan(0);
        expect(labelBounds!.x).toBeGreaterThanOrEqual(chartBounds!.x);
        expect(labelBounds!.x + labelBounds!.width).toBeLessThanOrEqual(
          chartBounds!.x + chartBounds!.width,
        );
      }
    };
    await verifyAxes();
    if (width > 1150) {
      const os = await page.locator('.os-view-compact').boundingBox();
      expect(frontBounds!.y).toBeGreaterThanOrEqual(os!.y + os!.height);
      const neighbor = await page.locator('.builder-coverage-panel').boundingBox();
      expect(Math.abs(neighbor!.x - os!.x)).toBeLessThanOrEqual(1);
      expect(Math.abs(neighbor!.width - os!.width)).toBeLessThanOrEqual(1);
      expect(Math.abs(neighbor!.y - frontBounds!.y)).toBeLessThanOrEqual(1);
    }
    await page.getByLabel('Timing basis').selectOption('observed');
    await expect(frontPlot.locator('.xtitle')).toHaveText('AN completion (m:ss)');
    await verifyAxes();
    await page.getByLabel('Role', { exact: true }).selectOption('Tech');
    await verifyAxes();
    await page.setViewportSize({ width: width === 1440 ? 1920 : 1440, height: 1080 });
    await verifyAxes();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      page.viewportSize()!.width,
    );
  });
