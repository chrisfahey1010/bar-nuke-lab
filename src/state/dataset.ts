import type { Snapshot, Context } from '../domain/types';
import { makeSnapshot, restoreSnapshot } from '../data/snapshot';
import { parseSheet } from '../data/sheetAdapter';
import { buildContext } from '../data/gameMetadata';
export type DatasetState = {
  snapshot: Snapshot | null;
  context: Context | null;
  status: 'empty' | 'loading' | 'fresh' | 'cached' | 'imported';
  error: string | null;
};
export const CACHE_KEY = 'bar-nuke-lab.snapshot.v1';
export function createDatasetStore(
  transport: (signal: AbortSignal) => Promise<string>,
  storage?: Pick<Storage, 'getItem' | 'setItem'>,
) {
  let state: DatasetState = { snapshot: null, context: null, status: 'empty', error: null };
  let epoch = 0;
  let controller: AbortController | null = null;
  const listeners = new Set<() => void>();
  const publish = (next: DatasetState) => {
    state = next;
    listeners.forEach((fn) => fn());
  };
  const commit = (snapshot: Snapshot, status: DatasetState['status']) => {
    const context = buildContext(parseSheet(snapshot.csv));
    let error = null;
    try {
      storage?.setItem(CACHE_KEY, JSON.stringify(snapshot));
    } catch {
      error = 'Loaded successfully; browser cache unavailable';
    }
    publish({ snapshot, context, status, error });
  };
  try {
    const cached = storage?.getItem(CACHE_KEY);
    if (cached) {
      const s = restoreSnapshot(cached);
      state = {
        snapshot: s,
        context: buildContext(parseSheet(s.csv)),
        status: s.source === 'imported' ? 'imported' : 'cached',
        error: null,
      };
    }
  } catch {
    state.error = 'Invalid cache ignored; import CSV/JSON or refresh';
  }
  const failure = (error: unknown) =>
    publish({
      ...state,
      status: state.snapshot
        ? state.snapshot.source === 'imported'
          ? 'imported'
          : 'cached'
        : 'empty',
      error: error instanceof Error ? error.message : String(error),
    });
  return {
    getState: () => state,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    refresh: async () => {
      const own = ++epoch;
      controller?.abort();
      const current = new AbortController();
      controller = current;
      publish({ ...state, status: 'loading', error: null });
      try {
        const text = await transport(current.signal);
        if (own === epoch) commit(makeSnapshot(text, 'google', 'Google Sheet1'), 'fresh');
      } catch (e) {
        if (own === epoch) failure(e);
      }
    },
    importFile: async (file: Pick<File, 'name' | 'text'>) => {
      const own = ++epoch;
      controller?.abort();
      publish({ ...state, status: 'loading', error: null });
      try {
        const text = await file.text();
        if (own === epoch) commit(makeSnapshot(text, 'imported', file.name), 'imported');
      } catch (e) {
        if (own === epoch) failure(e);
      }
    },
    importText: (text: string, label: string) => {
      ++epoch;
      controller?.abort();
      try {
        commit(makeSnapshot(text, 'imported', label), 'imported');
      } catch (e) {
        failure(e);
      }
    },
  };
}
