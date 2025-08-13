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
    const res = await fetchVehicles([...ROUTE_SHORTCODES]);
    if (!res.ok) return;
    this.positions.buses = res.value;
  }

  private async refreshSelectableRoutes() {
    const selRes = await fetchSelectableRoutes();
    if (!selRes.ok) return;
    const data = selRes.value.data;
    this.routeSelections = data;

    const routes = data["bustime-response"].routes as { rt: string }[];
    const patternResults = await Promise.all(routes.map((r) => fetchPatterns(r.rt)));
    patternResults.forEach((pr, idx) => {
      if (pr.ok) {
        const rt = routes[idx].rt;
        this.cachedRoutes[rt] = pr.value.data["bustime-response"].ptr;
      }
    });
  }
}

export const busState = new BusState(); 