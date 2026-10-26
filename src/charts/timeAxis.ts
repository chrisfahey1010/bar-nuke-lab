import type { Layout } from 'plotly.js';
import { formatTime } from '../domain/time';

// Shared horizontal gutters keep vertically stacked timing plot endpoints aligned.
export const TIMING_PLOT_GUTTERS = { l: 82, r: 28 };

export function timeWindowAxis(title: string): Partial<Layout['xaxis']> {
  const ticks = [12, 15, 20, 25];
  return {
    title: { text: title + ' (m:ss)' },
    range: [12, 25],
    tickmode: 'array',
    tickvals: ticks,
    ticktext: ticks.map((minutes) => formatTime(minutes * 60)),
    gridcolor: '#25313e',
  };
}
