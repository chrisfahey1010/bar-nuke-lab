// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, test } from 'vitest';
import { SourceStatus } from '../../src/components/SourceStatus';
import { createDatasetStore } from '../../src/state/dataset';
const csv = 'Game ID,OS,Position,AN built time\n1,20,Tech,11:18';
test('latest file selection wins even when an older file read resolves last', async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  const store = createDatasetStore(async () => csv);
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  const props = {
    state: store.getState(),
    refresh: () => void store.refresh(),
    importText: store.importText,
    importFile: (file: File) => store.importFile(file),
    auto: true,
    setAuto: () => {},
    exportSnapshot: () => {},
  };
  let resolveA!: (text: string) => void, resolveB!: (text: string) => void;
  const a = {
    name: 'older.csv',
    text: () =>
      new Promise<string>((r) => {
        resolveA = r;
      }),
  };
  const b = {
    name: 'newer.csv',
    text: () =>
      new Promise<string>((r) => {
        resolveB = r;
      }),
  };
  try {
    await act(async () => {
      root.render(React.createElement(SourceStatus, props));
    });
    const input = container.querySelector('input[type=file]')!;
    await act(async () => {
      Object.defineProperty(input, 'files', { value: [a], configurable: true });
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await act(async () => {
      Object.defineProperty(input, 'files', { value: [b], configurable: true });
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await act(async () => {
      resolveB(csv.replace('Tech', 'Air'));
    });
    expect(store.getState().snapshot?.label).toBe('newer.csv');
    await act(async () => {
      resolveA(csv);
    });
    expect(store.getState().snapshot?.label).toBe('newer.csv');
    expect(store.getState().context?.dataset.rows[0].role).toBe('Air');
  } finally {
    await act(async () => root.unmount());
    container.remove();
  }
});
