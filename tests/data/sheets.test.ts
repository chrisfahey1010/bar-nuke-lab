import { expect, test, vi } from 'vitest';
import { fetchSheet } from '../../src/data/sheets';
import { SOURCE_URL } from '../../src/data/snapshot';
test('uses a credential-free read-only request to the fixed CSV source', async () => {
  const mock = vi
    .fn<typeof fetch>()
    .mockResolvedValue(new Response('actual transport text', { status: 200 }));
  expect(await fetchSheet(new AbortController().signal, mock)).toBe('actual transport text');
  expect(mock).toHaveBeenCalledWith(
    SOURCE_URL,
    expect.objectContaining({ credentials: 'omit', cache: 'no-store', method: 'GET' }),
  );
  await expect(
    fetchSheet(
      new AbortController().signal,
      vi.fn<typeof fetch>().mockResolvedValue(new Response('', { status: 403 })),
    ),
  ).rejects.toThrow('403');
});
test('times out even a hung transport and propagates supersession abort', async () => {
  const hung = vi.fn<typeof fetch>().mockImplementation(() => new Promise(() => {}));
  await expect(fetchSheet(new AbortController().signal, hung, 20)).rejects.toThrow(/timed out/);
  const controller = new AbortController();
  const pending = fetchSheet(controller.signal, hung);
  controller.abort();
  await expect(pending).rejects.toThrow(/aborted/);
}, 250);
