import { test, expect } from '@playwright/test';
import { mockSheet } from './helpers';
import { csvOf } from '../fixtures/helpers';
import type { RawRow } from '../../src/domain/types';

const records: RawRow[] = [
  {
    'Game ID': 'TEST-ONLY-A',
    'Team ID': '1',
    Position: 'Tech',
    OS: '30',
    'AN built time': '12:00',
    'Front situation upon AN build': 'Advantage',
    'Other positions covered': 'Air',
    'Game duration': '30:00',
  },
  {
    'Game ID': 'TEST-ONLY-A',
    'Team ID': '1',
    Position: 'Air',
    OS: '0',
    'AN built time': '',
    'Front situation upon AN build': '',
  },
  {
    'Game ID': 'TEST-ONLY-B',
    'Team ID': '1',
    Position: 'Tech',
    OS: '10',
    'AN built time': '14:00',
    'Front situation upon AN build': 'Disadvantage',
    'Game duration': '30:00',
  },
  {
    'Game ID': 'TEST-ONLY-C',
    'Team ID': '1',
    Position: 'Tech',
    OS: '20',
    'AN built time': '13:00',
    'Front situation upon AN build': 'Equal',
    'Game duration': '30:00',
  },
  {
    'Game ID': 'TEST-ONLY-D',
    'Team ID': '1',
    Position: 'Tech',
    OS: '20',
    'AN built time': '26:00',
    'Front situation upon AN build': 'Equal',
    'Game duration': '30:00',
  },
];

test('front panel compares builder events by position without labeling covered nonbuilders', async ({
  page,
}) => {
  await mockSheet(page, csvOf(records));
  await page.goto('/');
  const panel = page.locator('.front-situation-panel');
  await expect(panel.getByRole('heading', { name: 'Front situation & AN timing' })).toBeVisible();
  await expect(panel).toContainText('Association, not cause');
  await expect(panel.getByTestId('front-point-count')).toHaveText('3');
  await expect(panel).toContainText('1 later build');
  await panel.getByText('Timing comparisons & sample details', { exact: true }).click();
  const summaries = panel.getByRole('table', {
    name: 'AN timing summaries by position and front situation',
  });
  await expect(summaries.locator('tbody tr').first().locator('td').nth(4)).toHaveText(
    'Points only',
  );
  const plot = panel.locator('.js-plotly-plot');
  await expect(plot.locator('.xtitle')).toHaveText('Own modeled readiness (m:ss)');
  const sourceTimes = () =>
    plot.evaluate((node) =>
      (
        node as unknown as {
          data: { customdata?: string[]; x: number[] }[];
        }
      ).data
        .filter((trace) => trace.customdata)
        .flatMap((trace) => trace.x)
        .sort((a, b) => a - b),
    );
  expect(await sourceTimes()).toEqual([13.5, 14.5, 15.5]);
  await panel.locator('.scatterlayer .point').first().click({ force: true });
  await expect(page.locator('.record-stats')).toContainText('Front at AN completion');
  await expect(page.locator('.record-stats')).toContainText('Disadvantage');
  await page.getByLabel('Timing basis').selectOption('observed');
  await expect(plot.locator('.xtitle')).toHaveText('AN completion (m:ss)');
  await expect.poll(sourceTimes).toEqual([12, 13, 14]);
  await expect(panel.getByLabel('Include builds after 25:00')).toHaveCount(0);
  await expect(panel.getByTestId('front-point-count')).toHaveText('3');
  await expect.poll(sourceTimes).toEqual([12, 13, 14]);
  await page.getByLabel('Role', { exact: true }).selectOption('Air');
  await expect(panel.getByTestId('front-point-count')).toHaveText('0');
  await expect(panel).toContainText('No timed builders with a recognized front situation');
  await expect(panel).toContainText('1 nonbuilder');
  await page.getByRole('button', { name: 'Methodology', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('Front situation at completion');
});

test('observed post-end modeled readiness is explicitly outside the match, not online', async ({
  page,
}) => {
  await mockSheet(
    page,
    csvOf([
      {
        'Game ID': 'TEST-ONLY-END',
        'Team ID': '1',
        Position: 'Tech',
        OS: '20',
        'AN built time': '19:00',
        'Front situation upon AN build': 'Equal',
        'Game duration': '20:00',
      },
    ]),
  );
  await page.goto('/');
  const panel = page.locator('.front-situation-panel');
  await expect(panel.getByTestId('front-point-count')).toHaveText('0');
  await page.getByLabel('Timing basis').selectOption('observed');
  await expect(panel.getByTestId('front-point-count')).toHaveText('1');
  await panel.locator('.scatterlayer .point').hover({ force: true });
  await expect(panel.locator('.hoverlayer')).toContainText(
    'modeled readiness 20:30 · outside match',
  );
  await expect(panel).toContainText('Switching timing basis can change the sample');
});

test('qualifying median and IQR overlays retain source inspection at a median intersection', async ({
  page,
}) => {
  // Median row is source row 7: its deterministic jitter is zero, exactly crossing the median tick.
  const builders: RawRow[] = [12, 13, 15, 16, 14].map((minute, i) => ({
    'Game ID': `TEST-ONLY-SUMMARY-${i}`,
    'Team ID': '1',
    Position: 'Tech',
    OS: '20',
    'AN built time': `${minute}:00`,
    'Front situation upon AN build': 'Equal',
    'Game duration': '30:00',
  }));
  builders.push(
    ...[11, 12, 13, 14, 15].map((minute, i) => ({
      'Game ID': `TEST-ONLY-SUMMARY-${i}`,
      'Team ID': '2',
      Position: 'Tech',
      OS: '20',
      'AN built time': `${minute}:00`,
      'Front situation upon AN build': 'Advantage',
      'Game duration': '30:00',
    })),
  );
  await mockSheet(page, csvOf(builders));
  await page.goto('/');
  const panel = page.locator('.front-situation-panel');
  const plot = panel.locator('.js-plotly-plot');
  await expect(panel.getByTestId('front-point-count')).toHaveText('10');
  await expect(plot.locator('.js-line')).toHaveCount(2);
  const traceState = await plot.evaluate((node) =>
    (
      node as unknown as {
        data: { name: string; customdata?: string[]; x: number[]; hoverinfo: string }[];
      }
    ).data.filter(
      (trace) => trace.name === 'Equal · median' || trace.name === 'Equal · middle 50%',
    ),
  );
  expect(traceState.map((trace) => trace.x)).toEqual([[14.5, 16.5, null], [15.5]]);
  expect(traceState.every((trace) => !trace.customdata && trace.hoverinfo === 'skip')).toBe(true);
  await panel.getByText('Timing comparisons & sample details', { exact: true }).click();
  await expect(panel.getByRole('table')).toContainText('1:00 earlier');
  // Real-point traces draw after summaries. Equal's final point is the exact median intersection.
  const marker = plot
    .locator('.scatterlayer .trace')
    .filter({ has: page.locator('.point') })
    .nth(2)
    .locator('.point')
    .last();
  await marker.click({ force: true });
  await expect(page.locator('.record-identity')).toContainText('TEST-ONLY-SUMMARY-4');
  await expect(page.locator('.record-stats')).toContainText('14:00');
  await expect(page.locator('.record-stats')).toContainText('Equal');
});
