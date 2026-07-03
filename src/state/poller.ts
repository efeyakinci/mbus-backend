export function startPolling(
  refresh: () => Promise<void>,
  intervalMs: number,
): void {
  void refresh();
  setInterval(() => void refresh(), intervalMs);
}
