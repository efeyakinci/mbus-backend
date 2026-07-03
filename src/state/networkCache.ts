import {
  fetchPatterns,
  fetchRoutes,
  type BustimePattern,
} from "../bustime/client.ts";
import { toNetwork } from "../bustime/mapping.ts";
import { catalogRouteIds } from "../catalog.ts";
import type { Network } from "../domain.ts";
import { startPolling } from "./poller.ts";

class NetworkCache {
  network: Network = { routes: [], stops: [] };
  legacyRouteSelections: unknown = {};
  legacyPatterns: Record<string, unknown> = {};

  start(): void {
    startPolling(() => this.refresh(), 60_000);
  }

  private async refresh(): Promise<void> {
    const routesRes = await fetchRoutes();
    if (!routesRes.ok) return;
    const payload = routesRes.value;
    // A bad key or upstream error still returns HTTP 200, with an error
    // payload instead of routes.
    const liveRoutes = payload["bustime-response"].routes;
    if (!Array.isArray(liveRoutes)) return;
    this.legacyRouteSelections = payload;

    const liveIds = liveRoutes.map((r) => r.rt);
    const pollIds = [...new Set([...liveIds, ...catalogRouteIds])];
    const results = await Promise.all(
      pollIds.map(async (id) => ({ id, res: await fetchPatterns(id) })),
    );

    const patterns: Record<string, BustimePattern[]> = {};
    for (const { id, res } of results) {
      const ptr = res.ok ? res.value["bustime-response"].ptr : undefined;
      if (!ptr) continue;
      patterns[id] = ptr;
      if (liveIds.includes(id)) this.legacyPatterns[id] = ptr;
    }

    this.network = toNetwork(
      Object.fromEntries(
        Object.entries(patterns).filter(([id]) => catalogRouteIds.includes(id)),
      ),
    );
  }
}

export const networkCache = new NetworkCache();
