import {
  fetchPatterns,
  fetchRoutes,
  type BustimePattern,
} from "../bustime/client.ts";
import { toNetwork } from "../bustime/mapping.ts";
import { catalogRouteIds } from "../catalog.ts";
import type { Network } from "../domain.ts";
import { logger } from "../logger.ts";
import { startPolling } from "./poller.ts";

class NetworkCache {
  network: Network = { routes: [], stops: [] };
  legacyRouteSelections: unknown = {};
  legacyPatterns: Record<string, unknown> = {};

  start(): void {
    startPolling("network", () => this.refresh(), 60_000);
  }

  private async refresh(): Promise<void> {
    const payload = await fetchRoutes();
    const liveRoutes = payload["bustime-response"].routes;
    if (!liveRoutes) {
      // A bad key or upstream error still returns HTTP 200, with an error
      // payload instead of routes.
      throw new Error("getroutes returned no routes");
    }
    this.legacyRouteSelections = payload;

    const liveIds = liveRoutes.map((r) => r.rt);
    const pollIds = [...new Set([...liveIds, ...catalogRouteIds])];
    const results = await Promise.allSettled(
      pollIds.map(async (id) => ({
        id,
        ptr: (await fetchPatterns(id))["bustime-response"].ptr,
      })),
    );

    const patterns: Record<string, BustimePattern[]> = {};
    for (const result of results) {
      if (result.status === "rejected") {
        logger.warn({ err: result.reason }, "pattern refresh failed");
        continue;
      }
      const { id, ptr } = result.value;
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
