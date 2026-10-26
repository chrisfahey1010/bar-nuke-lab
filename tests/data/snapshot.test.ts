import { expect, test } from 'vitest';
import { makeSnapshot } from '../../src/data/snapshot';
import { createDatasetStore } from '../../src/state/dataset';
const csv = 'Game ID,OS,Position,AN built time\n1,20,Tech,11:18';
test('accepts current CSV, labels imports honestly and rejects source failures', () => {
  const s = makeSnapshot(csv, 'google', 'Sheet1');
  expect(s.source).toBe('google');
  expect(s.csv).toBe(csv);
  expect(s.version).toBe(1);
  expect(makeSnapshot(JSON.stringify(s), 'imported', 'offline.json').source).toBe('imported');
  expect(() => makeSnapshot('<!doctype html><html>login</html>', 'google', 'Sheet1')).toThrow(
    /HTML|login/,
  );
  expect(() => makeSnapshot('Wrong,Headers\n1,2', 'google', 'Sheet1')).toThrow(/required headers/);
  expect(() => makeSnapshot('Game ID,OS,Position,AN built time\n,,,', 'google', 'Sheet1')).toThrow(
    /usable/,
  );
});
test('failed or unusable refresh retains the exact last-good snapshot and signals cached freshness', async () => {
  let text = csv;
  let fail = false;
  const cache = new Map<string, string>();
  const storage = {
    getItem: (k: string) => cache.get(k) ?? null,
    setItem: (k: string, v: string) => {
      cache.set(k, v);
    },
  };
  const store = createDatasetStore(async () => {
    if (fail) throw new Error('Offline');
    return text;
  }, storage);
  await store.refresh();
  const good = store.getState().snapshot;
  expect(good?.csv).toBe(csv);
  expect(store.getState().status).toBe('fresh');
  fail = true;
  await store.refresh();
  expect(store.getState().snapshot).toBe(good);
  expect(store.getState().status).toBe('cached');
  expect(store.getState().error).toContain('Offline');
  fail = false;
  text = '<html>Login</html>';
  await store.refresh();
  expect(store.getState().snapshot).toBe(good);
  const restored = createDatasetStore(async () => csv, storage);
  expect(restored.getState().status).toBe('cached');
  text = 'Position,OS,Game ID,AN built time\nAir,10,2,?';
  await store.refresh();
  expect(store.getState().context?.dataset.rows[0].role).toBe('Air');
  store.importText(csv, 'test-only.csv');
  expect(store.getState().status).toBe('imported');
  expect(store.getState().snapshot?.source).toBe('imported');
});
test('superseded refresh cannot overwrite a newer refresh or imported snapshot', async () => {
  const resolves: ((v: string) => void)[] = [];
  const signals: AbortSignal[] = [];
  const store = createDatasetStore((signal) => {
    signals.push(signal);
    return new Promise((resolve) => resolves.push(resolve));
  });
  const first = store.refresh();
  const second = store.refresh();
  resolves[1](csv.replace('Tech', 'Air'));
  await second;
  resolves[0](csv);
  await first;
  expect(signals[0].aborted).toBe(true);
  expect(store.getState().context?.dataset.rows[0].role).toBe('Air');
  const third = store.refresh();
  store.importText(csv.replace('Tech', 'Geo'), 'local fixture');
  resolves[2](csv);
  await third;
  expect(store.getState().snapshot?.source).toBe('imported');
  expect(store.getState().context?.dataset.rows[0].role).toBe('Geo');
});
test('a newer refresh supersedes a still-reading file, and read errors preserve last-good data', async () => {
  const store = createDatasetStore(async () => csv);
  await store.refresh();
  let resolve!: (text: string) => void;
  const pending = store.importFile({
    name: 'slow.csv',
    text: () =>
      new Promise<string>((r) => {
        resolve = r;
      }),
  });
  await store.refresh();
  const fresh = store.getState().snapshot;
  resolve(csv.replace('Tech', 'Air'));
  await pending;
  expect(store.getState().snapshot).toBe(fresh);
  expect(store.getState().snapshot?.source).toBe('google');
  await store.importFile({
    name: 'bad.csv',
    text: async () => {
      throw new Error('File read failed');
    },
  });
  expect(store.getState().snapshot).toBe(fresh);
  expect(store.getState().status).toBe('cached');
  expect(store.getState().error).toContain('File read failed');
});
