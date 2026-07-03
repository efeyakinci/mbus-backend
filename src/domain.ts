export interface LatLng {
  lat: number;
  lon: number;
}

export interface CatalogRoute {
  id: string;
  name: string;
  color: string;
  colorblindColor: string;
}

export interface Catalog {
  version: number;
  routes: CatalogRoute[];
}

export interface Stop {
  id: string;
  name: string;
  position: LatLng;
}

export interface Segment {
  path: LatLng[];
  detour?: LatLng[];
}

export interface RouteGeometry {
  routeId: string;
  segments: Segment[];
  stopIds: string[];
}

export interface Network {
  routes: RouteGeometry[];
  stops: Stop[];
}

export type PassengerLoad = "EMPTY" | "HALF_EMPTY" | "FULL";

export interface Vehicle {
  id: string;
  routeId: string;
  position: LatLng;
  heading: number;
  load: PassengerLoad | null;
}

export interface Arrival {
  vehicleId: string;
  routeId: string;
  stopId: string;
  stopName: string;
  destination: string;
  /** Whole minutes until arrival; 0 means due now; null means delayed. */
  etaMinutes: number | null;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  minBuild: number;
  maxBuild: number;
}
