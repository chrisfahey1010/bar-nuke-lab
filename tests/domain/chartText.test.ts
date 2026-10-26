import { expect, test } from 'vitest';
import { escapeHover } from '../../src/charts/text';
test('keeps literal imported source tokens out of Plotly HTML hover markup', () => {
  expect(escapeHover('<a href="javascript:x">A&B</a>')).toBe(
    '&lt;a href=&quot;javascript:x&quot;&gt;A&amp;B&lt;/a&gt;',
  );
});
