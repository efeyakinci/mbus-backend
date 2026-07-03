import { fetchVehicles, type BustimeVehicle } from "../bustime/client.ts";
import { toVehicle } from "../bustime/mapping.ts";
import { catalogRouteIds } from "../catalog.ts";
import type { Vehicle } from "../domain.ts";
import { startPolling } from "./poller.ts";

class VehicleCache {
  vehicles: Vehicle[] = [];
  legacyPositions: { buses: BustimeVehicle[] } = { buses: [] };

  start(): void {
    startPolling(() => this.refresh(), 7_500);
  }

  private async refresh(): Promise<void> {
    const res = await fetchVehicles(catalogRouteIds);
    if (!res.ok) return;
    this.legacyPositions.buses = res.value;
    this.vehicles = res.value.map(toVehicle);
  }
}

export const vehicleCache = new VehicleCache();
