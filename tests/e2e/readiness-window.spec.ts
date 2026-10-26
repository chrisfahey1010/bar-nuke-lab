import { test, expect, type Page } from '@playwright/test';
import { mockSheet } from './helpers';
import { csvOf, fullRows } from '../fixtures/helpers';
import { ROLES } from '../../src/data/normalize';
import { parseSheet } from '../../src/data/sheetAdapter';
import { buildContext } from '../../src/data/gameMetadata';
import { ongoingSummary } from '../../src/analytics/summary';
import { ROLE_COLORS } from '../../src/views/OsRelationship';

test('All roles plots only recorded coverage by retained target position with the OS palette', async ({
  page,
}) => {
  const ended = fullRows('TEST-ONLY-ended', '20:00');
  for (const row of ended) {
    row['AN built time'] = '';
    row['AN Type'] = '';
    row['Other positions covered'] = '';
  }
  // Source order must not set trace order; roles without timed builders still need curves.
  const csv = csvOf([...ended.reverse(), ...fullRows('TEST-ONLY-ongoing', '24:00').reverse()]);
  const context = buildContext(parseSheet(csv));
  await mockSheet(page, csv);
  await page.goto('/');
  const panel = page.locator('.timing-panel');
  const plot = panel.locator('.js-plotly-plot');
  await expect(plot.locator('.ytitle')).toHaveText('AN readiness (%)');
  await expect
    .poll(() =>
      plot.evaluate((node) =>
        (node as unknown as { data: { name: string }[] }).data.map((trace) => trace.name),
      ),
    )
    .toEqual(ROLES.map((role) => `${role} · recorded target coverage`));
  const traces = await plot.evaluate((node) =>
    (
      node as unknown as {
        data: {
          x: number[];
          y: (number | null)[];
          text: string[];
          line: { color: string; shape: string };
          connectgaps: boolean;
          customdata?: unknown;
        }[];
      }
    ).data.map(({ x, y, text, line, connectgaps, customdata }) => ({
      x,
      y,
      text,
      line,
      connectgaps,
      selectable: customdata !== undefined,
    })),
  );
  for (const [index, role] of ROLES.entries()) {
    const targets = context.dataset.rows.filter((row) => row.role === role);
    const expected = Array.from({ length: 781 }, (_, i) =>
      ongoingSummary(context, targets, 720 + i),
    );
    expect(traces[index].x).toEqual(expected.map((_, i) => (720 + i) / 60));
    expect(traces[index].y).toEqual(expected.map((point) => point.coverage.percentage));
    expect(traces[index].text[48]).toContain(
      `${expected[48].coverage.numerator}/${expected[48].coverage.n} eligible observations · ${expected[48].games} ongoing games`,
    );
    expect(traces[index].line).toMatchObject({ color: ROLE_COLORS[role], shape: 'hv' });
    expect(traces[index].connectgaps).toBe(false);
    expect(traces[index].selectable).toBe(false);
  }
  await expect(panel).toContainText('stratified by target position');
  await expect(panel.getByRole('list', { name: 'Readiness position color key' })).toContainText(
    'Air',
  );
  await expect(plot.locator('.legend')).toHaveCount(0);
  // All-role cards keep their unstratified summary; they are not a per-role denominator.
  await expect(page.getByTestId('denominator')).toContainText('own N=32; coverage N=32');
  await page.getByLabel('Timing basis').selectOption('observed');
  await expect
    .poll(() =>
      plot.evaluate((node) =>
        (node as unknown as { data: { y: (number | null)[] }[] }).data.map((trace) => trace.y),
      ),
    )
    .toEqual(traces.map((trace) => trace.y));
  await page.locator('.os-view').getByRole('button', { name: 'Tech', exact: true }).click();
  await expect
    .poll(() =>
      plot.evaluate((node) =>
        (node as unknown as { data: { y: (number | null)[] }[] }).data.map((trace) => trace.y),
      ),
    )
    .toEqual(traces.map((trace) => trace.y));
});

test('unknown target positions stay distinct, neutrally colored and literally labeled', async ({
  page,
}) => {
  const rows = fullRows('TEST-ONLY-unknown').filter(
    (row) => row['Team ID'] === '1' && row.Position === 'Air',
  );
  rows.push(
    { ...rows[0], Position: 'Zulu unknown', 'Game duration': '' },
    { ...rows[0], Position: '<Scout>', 'Game duration': '' },
  );
  await mockSheet(page, csvOf(rows));
  await page.goto('/');
  await page.getByLabel('Include partial-roster sample').check();
  const panel = page.locator('.timing-panel');
  const plot = panel.locator('.js-plotly-plot');
  await expect(plot.locator('.ytitle')).toHaveText('AN readiness (%)');
  await expect
    .poll(() =>
      plot.evaluate((node) =>
        (node as unknown as { data: { name: string; line: { color: string } }[] }).data.map(
          ({ name, line }) => ({ name, color: line.color }),
        ),
      ),
    )
    .toEqual([
      { name: 'Air · recorded target coverage', color: ROLE_COLORS.Air },
      { name: '&lt;Scout&gt; · recorded target coverage', color: '#b8c5d2' },
      { name: 'Zulu unknown · recorded target coverage', color: '#b8c5d2' },
    ]);
  await expect(panel.getByRole('list', { name: 'Readiness position color key' })).toContainText(
    '<Scout>',
  );
});

test('All roles remains position-stratified when non-role filters retain one role and its provider is hidden', async ({
  page,
}) => {
  await mockSheet(
    page,
    csvOf(fullRows('TEST-ONLY-one-role', '').filter((row) => row['Team ID'] === '1')),
  );
  await page.goto('/');
  await page.getByLabel('OS maximum').fill('0');
  await page.getByLabel('AN type', { exact: true }).selectOption('$missing');
  await expect(page.getByLabel('Role', { exact: true })).toHaveValue('');
  await expectRates(page, 'Unavailable', 'Unavailable', ['Unavailable']);
  await page.getByLabel('Include partial-roster sample').check();
  await expectRates(page, '0.0%', '100.0%', ['100.0%']);
  const plot = page.locator('.timing-panel .js-plotly-plot');
  await expect
    .poll(() =>
      plot.evaluate((node) =>
        (node as unknown as { data: { name: string }[] }).data.map((trace) => trace.name),
      ),
    )
    .toEqual(['Air · recorded target coverage']);
  await expect(page.getByTestId('denominator')).toContainText('own N=1; coverage N=1');
  await setClock(page, 767);
  await expectRates(page, '0.0%', '0.0%', ['0.0%']);
  await setClock(page, 768);
  await expectRates(page, '0.0%', '100.0%', ['100.0%']);
  await page.getByLabel('Role', { exact: true }).selectOption('Air');
  await expectRates(page, '0.0%', '100.0%');
  await page.getByLabel('Role', { exact: true }).selectOption('');
  await expectRates(page, '0.0%', '100.0%', ['100.0%']);
  await page.getByLabel('Include partial-roster sample').uncheck();
  await expectRates(page, 'Unavailable', 'Unavailable', ['Unavailable']);
});

async function setClock(page: Page, seconds: number) {
  await page.getByRole('slider', { name: 'Game clock', exact: true }).fill(String(seconds));
}

async function expectRates(page: Page, own: string, coverage: string, plotted = [own, coverage]) {
  const cards = page.locator('.summary-strip .rate-card strong');
  await expect(cards.nth(0)).toContainText(own);
  await expect(cards.nth(1)).toContainText(coverage);
  const plot = page.locator('.timing-panel .js-plotly-plot');
  await expect
    .poll(() =>
      plot.evaluate((node) => {
        const g = node as unknown as {
          data: { x: number[]; y: (number | null)[] }[];
          layout: { shapes: { x0: number }[] };
        };
        const time = g.layout.shapes[0].x0;
        return g.data.map((trace) => {
          let index = -1;
          trace.x.forEach((x, i) => {
            if (x <= time) index = i;
          });
          const value = trace.y[index];
          return value === null ? 'Unavailable' : value.toFixed(1) + '%';
        });
      }),
    )
    .toEqual(plotted);
}

test('readiness curves match the cards and remove ended games rather than counting them uncovered', async ({
  page,
}) => {
  const online = fullRows('TEST-ONLY-online', '24:00');
  const ended = fullRows('TEST-ONLY-ended', '20:00');
  for (const row of ended) {
    row['AN built time'] = '';
    row['AN Type'] = '';
    row['Other positions covered'] = '';
  }
  await mockSheet(page, csvOf([...online, ...ended]));
  await page.goto('/');
  await page.getByLabel('Role', { exact: true }).selectOption('Air');
  const plot = page.locator('.timing-panel .js-plotly-plot');
  await expect(plot.locator('.ytitle')).toHaveText('AN readiness (%)');
  await expect(plot.locator('.ytick text').last()).toHaveText('100%');
  await setClock(page, 767);
  await expectRates(page, '0.0%', '0.0%');
  await setClock(page, 768);
  await expectRates(page, '0.0%', '50.0%');
  await setClock(page, 1199);
  await expectRates(page, '0.0%', '50.0%');
  await setClock(page, 1200);
  await expectRates(page, '0.0%', '100.0%');
  await page.getByLabel('Role', { exact: true }).selectOption('Tech');
  await expectRates(page, '100.0%', '100.0%');
  await page.getByLabel('Timing basis').selectOption('observed');
  await expect(page.locator('.timing-panel h2')).toHaveText('Modeled timing window');
  await expect(page.locator('.os-view .xtitle')).toHaveText('Observed completion (m:ss)');
  await expectRates(page, '100.0%', '100.0%');
  await setClock(page, 1440);
  await expectRates(page, 'Unavailable', 'Unavailable');
  await expect(plot).toContainText('Readiness unavailable at this clock');
  expect(
    await plot.evaluate((node) =>
      (
        node as unknown as {
          data: { connectgaps: boolean }[];
        }
      ).data.every((trace) => trace.connectgaps === false),
    ),
  ).toBe(true);
});

test('readiness curves follow partial-roster opt-in and retain providers outside target filters', async ({
  page,
}) => {
  await mockSheet(
    page,
    csvOf(fullRows('TEST-ONLY-partial', '').filter((row) => row['Team ID'] === '1')),
  );
  await page.goto('/');
  await page.getByLabel('Role', { exact: true }).selectOption('Air');
  await page.getByLabel('OS maximum').fill('0');
  await page.getByLabel('AN type', { exact: true }).selectOption('$missing');
  await expectRates(page, 'Unavailable', 'Unavailable');
  await page.getByLabel('Include partial-roster sample').check();
  await expectRates(page, '0.0%', '100.0%');
  await expect(page.locator('.timing-panel')).toContainText('Partial-roster sample included');
  await expect(page.getByTestId('denominator')).toContainText('own N=1; coverage N=1');
  await page.getByLabel('Include partial-roster sample').uncheck();
  await expectRates(page, 'Unavailable', 'Unavailable');
});

test('readiness curves follow linked row selection and distinguish unknown coverage from zero', async ({
  page,
}) => {
  const rows = fullRows('TEST-ONLY-linked');
  rows.find((row) => row.Position === 'Air' && row['Team ID'] === '1')!['Team ID'] = '';
  await mockSheet(page, csvOf(rows));
  await page.goto('/');
  await expectRates(page, '12.5%', '20.0%', ['100.0%', '100.0%', ...Array(6).fill('0.0%')]);
  await page.locator('.keyboard-selection summary').click();
  const selection = page.getByLabel('Linked row selection');
  const unknown = await selection
    .locator('option')
    .filter({ hasText: 'Team Unknown · Air' })
    .getAttribute('value');
  await selection.selectOption(unknown!);
  await expectRates(page, '0.0%', 'Unavailable', ['Unavailable']);
  await expect(page.locator('.timing-panel')).toContainText('Readiness unavailable at this clock');
  await expect
    .poll(() =>
      page
        .locator('.timing-panel .js-plotly-plot')
        .evaluate((node) =>
          (node as unknown as { data: { name: string }[] }).data.map((trace) => trace.name),
        ),
    )
    .toEqual(['Air · recorded target coverage']);
  await expect(page.getByTestId('denominator')).toContainText('own N=1; coverage N=0');
  await page.getByRole('button', { name: 'Clear linked selection' }).click();
  await expectRates(page, '12.5%', '20.0%', ['100.0%', '100.0%', ...Array(6).fill('0.0%')]);
  const known = await selection
    .locator('option')
    .filter({ hasText: 'Team 2 · Air' })
    .getAttribute('value');
  await selection.selectOption(known!);
  await expectRates(page, '0.0%', '100.0%', ['100.0%']);
  await page.getByLabel('Role', { exact: true }).selectOption('Air');
  await expectRates(page, '0.0%', '100.0%');
  await expect
    .poll(() =>
      page
        .locator('.timing-panel .js-plotly-plot')
        .evaluate((node) =>
          (node as unknown as { data: { name: string }[] }).data.map((trace) => trace.name),
        ),
    )
    .toEqual(['Own AN modeled online', 'Recorded target coverage']);
});
