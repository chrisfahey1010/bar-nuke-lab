// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, test, vi } from 'vitest';
const { plotly, renders } = vi.hoisted(() => {
  const renders: (() => void)[] = [];
  return {
    renders,
    plotly: {
      react: vi.fn(
        (div: HTMLElement, data: { name: string }[]) =>
          new Promise((resolve) => {
            renders.push(() => {
              div.dataset.rendered = data[0].name;
              resolve(Object.assign(div, { on: vi.fn(), removeAllListeners: vi.fn() }));
            });
          }),
      ),
      purge: vi.fn((div: HTMLElement) => {
        delete div.dataset.rendered;
      }),
      Plots: { resize: vi.fn() },
    },
  };
});
vi.mock('../../src/charts/plotly', () => ({ default: plotly }));
import { Chart } from '../../src/components/Chart';
test('serializes rapid chart updates and never purges a newer render', async () => {
  Object.assign(globalThis, {
    IS_REACT_ACT_ENVIRONMENT: true,
    ResizeObserver: class {
      observe() {}
      disconnect() {}
    },
  });
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  const props = (name: string) => ({
    data: [{ type: 'scatter' as const, name }],
    label: 'test chart',
  });
  try {
    await act(async () => {
      root.render(React.createElement(Chart, props('older')));
    });
    await vi.waitFor(() => expect(plotly.react).toHaveBeenCalledTimes(1));
    await act(async () => {
      root.render(React.createElement(Chart, props('newer')));
    });
    expect(plotly.react).toHaveBeenCalledTimes(1);
    await act(async () => {
      renders[0]();
    });
    await vi.waitFor(() => expect(plotly.react).toHaveBeenCalledTimes(2));
    await act(async () => {
      renders[1]();
    });
    expect(container.querySelector('[data-rendered]')?.getAttribute('data-rendered')).toBe('newer');
    expect(plotly.purge).not.toHaveBeenCalled();
  } finally {
    await act(async () => root.unmount());
    container.remove();
  }
  await vi.waitFor(() => expect(plotly.purge).toHaveBeenCalledTimes(1));
});
