import { fetchVehicles, fetchSelectableRoutes, fetchPatterns } from "@/api/mbus";
import { ROUTE_SHORTCODES } from "@/constants/routes";
import type { Vehicle } from "@/api/mbus";

interface BusPositions {
  buses: Vehicle[];
}

class BusState {
  private positions: BusPositions = { buses: [] };
  private cachedRoutes: Record<string, unknown> = {};
  private routeSelections: unknown = {};
  private readonly updateIntervalMs: number;
  private readonly routesIntervalMs: number;

  constructor(updateIntervalMs = 7_500, routesIntervalMs = 60_000) {
    this.updateIntervalMs = updateIntervalMs;
    this.routesIntervalMs = routesIntervalMs;
  }

  /**
   * Initialize periodic background tasks. Call once during app bootstrap.
   */
  start(): void {
    this.refreshBusPositions();
    this.refreshSelectableRoutes();

    setInterval(() => void this.refreshBusPositions(), this.updateIntervalMs);
    setInterval(() => void this.refreshSelectableRoutes(), this.routesIntervalMs);
  }

  get currentPositions(): BusPositions {
    return this.positions;
  }

  get currentRouteSelections() {
    return this.routeSelections;
  }

  get allCachedRoutes() {
    return this.cachedRoutes;
  }

  private async refreshBusPositions() {
    this.positions.buses = await fetchVehicles([...ROUTE_SHORTCODES]);
    console.log(this.positions.buses);
  }

  private async refreshSelectableRoutes() {
    const data = await fetchSelectableRoutes();
    this.routeSelections = data;

    try {
      const routes = data["bustime-response"].routes as { rt: string }[];
      await Promise.all(
        routes.map(async (r) => {
          const patterns = await fetchPatterns(r.rt);
          this.cachedRoutes[r.rt] = patterns["bustime-response"].ptr;
        }),
      );
    } catch (_) {
      // Intentionally allow failure to propagate on next interval.
    }
  }
}

export const busState = new BusState(); 