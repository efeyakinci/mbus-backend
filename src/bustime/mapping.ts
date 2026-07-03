import type {
  Arrival,
  Network,
  PassengerLoad,
  RouteGeometry,
  Stop,
  Vehicle,
} from "../domain.ts";
import type {
  BustimePattern,
  BustimePrediction,
  BustimeVehicle,
} from "./client.ts";

const KNOWN_LOADS: PassengerLoad[] = ["EMPTY", "HALF_EMPTY", "FULL"];

function toLoad(psgld: string | undefined): PassengerLoad | null {
  return KNOWN_LOADS.find((l) => l === psgld) ?? null;
}

export function toVehicle(v: BustimeVehicle): Vehicle {
  return {
    id: v.vid,
    routeId: v.rt.trim(),
    position: { lat: Number(v.lat), lon: Number(v.lon) },
    heading: Number(v.hdg),
    load: toLoad(v.psgld),
  };
}

export function toArrival(p: BustimePrediction): Arrival {
  // prdctdn is minutes-as-digits, "DUE", or a delay marker such as "DLY".
  const minutes = /^\d+$/.test(p.prdctdn) ? Number(p.prdctdn) : null;
  return {
    vehicleId: p.vid,
    routeId: p.rt.trim(),
    stopId: p.stpid,
    stopName: p.stpnm,
    destination: p.des,
    etaMinutes: p.prdctdn === "DUE" ? 0 : minutes,
  };
}

export function toNetwork(
  patternsByRoute: Record<string, BustimePattern[]>,
): Network {
  const stops = new Map<string, Stop>();
  const routes: RouteGeometry[] = [];

  for (const [routeId, patterns] of Object.entries(patternsByRoute)) {
    const stopIds = new Set<string>();
    const segments = patterns.map((pattern) => {
      const collect = (points: BustimePattern["pt"]) =>
        points.map((point) => {
          if (point.typ === "S" && point.stpid && point.stpnm) {
            stopIds.add(point.stpid);
            stops.set(point.stpid, {
              id: point.stpid,
              name: point.stpnm,
              position: { lat: Number(point.lat), lon: Number(point.lon) },
            });
          }
          return { lat: Number(point.lat), lon: Number(point.lon) };
        });

      const path = collect(pattern.pt);
      const detour = pattern.dtrpt ? collect(pattern.dtrpt) : undefined;
      return detour ? { path, detour } : { path };
    });

    routes.push({ routeId, segments, stopIds: [...stopIds] });
  }

  return { routes, stops: [...stops.values()] };
}
