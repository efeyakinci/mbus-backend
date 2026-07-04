import { logger } from "../logger.ts";

// Recursive timeouts rather than setInterval so refreshes never overlap, and
// unref'd so pending polls don't hold the process open during shutdown.
export function startPolling(
  name: string,
  refresh: () => Promise<void>,
  intervalMs: number,
): void {
  const tick = async () => {
    try {
      await refresh();
    } catch (err) {
      logger.error({ err }, `${name} refresh failed`);
    }
    setTimeout(tick, intervalMs).unref();
  };
  void tick();
}
