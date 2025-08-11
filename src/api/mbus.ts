import axios from "axios";
import { API_KEY } from "@/config/env";

export const mbusClient = axios.create({
  baseURL: "https://mbus.ltp.umich.edu/bustime/api/v3/",
  params: {
    key: API_KEY,
    format: "json",
  },
});

/**
 * Raw response types from the MBus API are not fully specified; we capture
 * what we actually use to keep the codebase simple.
 */
export interface Vehicle {
  vid: string;
  rt: string;
  des: string;
  lat: number;
  lon: number;
  speed?: number;
  [k: string]: unknown;
}

export interface BustimeResponse<T> {
  "bustime-response": T;
}

/**
 * Fetch vehicles for the given route shortcodes.
 *
 * The upstream API silently returns an empty array if too many shortcodes are
 * supplied in a single request. Empirically, requests with > 9 shortcodes can
 * fail this way. To be safe, we batch requests with a maximum of 5 shortcodes
 * per call and merge the results. The public function signature remains the
 * same and the batching is transparent to callers.
 */
export async function fetchVehicles(routes: string[]): Promise<Vehicle[]> {
  if (routes.length === 0) return [];

  const MAX_SHORTCODES_PER_REQUEST = 5;
  const chunks: string[][] = [];
  for (let i = 0; i < routes.length; i += MAX_SHORTCODES_PER_REQUEST) {
    chunks.push(routes.slice(i, i + MAX_SHORTCODES_PER_REQUEST));
  }

  const responses = await Promise.all(
    chunks.map((chunk) =>
      mbusClient.get<BustimeResponse<{ vehicle: Vehicle[] }>>("/getvehicles", {
        params: {
          requestType: "getvehicles",
          rt: chunk.join(","),
        },
      }),
    ),
  );

  const vehicles: Vehicle[] = [];
  for (const res of responses) {
    const v = res.data["bustime-response"].vehicle ?? [];
    vehicles.push(...v);
  }
  return vehicles;
}

export async function fetchStopPredictions(stopId: string, routes: string[]) {
  const res = await mbusClient.get(
    "/getpredictions",
    {
      params: {
        requestType: "getpredictions",
        locale: "en",
        stpid: stopId,
        rt: routes.join(","),
        rtpidatafeed: "bustime",
        top: 4,
      },
    },
  );
  return res.data;
}

export async function fetchBusPredictions(busId: string) {
  const res = await mbusClient.get(
    "/getpredictions",
    {
      params: {
        requestType: "getpredictions",
        locale: "en",
        vid: busId,
        top: 4,
        tmres: "s",
        rtpidatafeed: "bustime",
      },
    },
  );
  return res.data;
}

export async function fetchSelectableRoutes() {
  const res = await mbusClient.get(
    "/getroutes",
    {
      params: {
        requestType: "getroutes",
        locale: "en",
      },
    },
  );
  return res.data;
}

export async function fetchPatterns(rt: string) {
  const res = await mbusClient.get(
    "/getpatterns",
    {
      params: {
        requestType: "getpatterns",
        rtpidatafeed: "bustime",
        rt,
      },
    },
  );
  return res.data;
} 