import { SOURCE_URL } from './snapshot';
export async function fetchSheet(
  signal: AbortSignal,
  fetcher: typeof fetch = fetch,
  timeoutMs = 20000,
): Promise<string> {
  const controller = new AbortController();
  const external = () => controller.abort(new Error('CSV request aborted'));
  signal.addEventListener('abort', external, { once: true });
  if (signal.aborted) external();
  const timer = setTimeout(
    () => controller.abort(new Error('CSV request timed out; last-good snapshot retained')),
    timeoutMs,
  );
  let abortHandler: () => void = () => {};
  const aborted = new Promise<never>((_, reject) => {
    abortHandler = () => reject(controller.signal.reason);
    controller.signal.addEventListener('abort', abortHandler, { once: true });
    if (controller.signal.aborted) abortHandler();
  });
  const request = async () => {
    const response = await fetcher(SOURCE_URL, {
      method: 'GET',
      credentials: 'omit',
      cache: 'no-store',
      signal: controller.signal,
    });
    if (!response.ok)
      throw new Error(`CSV request failed (${response.status}); import CSV/JSON or retry`);
    return response.text();
  };
  try {
    return await Promise.race([request(), aborted]);
  } finally {
    clearTimeout(timer);
    signal.removeEventListener('abort', external);
    controller.signal.removeEventListener('abort', abortHandler);
  }
}
