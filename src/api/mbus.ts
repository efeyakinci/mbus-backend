import axios from "axios";
import { API_KEY } from "@/config/env";
import { runExternal, type Result } from "@/api/external";

export const mbusClient = axios.create({
  baseURL: "https://mbus.ltp.umich.edu/bustime/api/v3/",
  params: {
    key: API_KEY,
    format: "json",
  },
  timeout: 5_000,
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
export async function fetchVehicles(routes: string[]): Promise<Result<Vehicle[]>> {
  if (routes.length === 0) return { ok: true, value: [] };

  const MAX_SHORTCODES_PER_REQUEST = 5;
  const chunks: string[][] = [];
  for (let i = 0; i < routes.length; i += MAX_SHORTCODES_PER_REQUEST) {
    chunks.push(routes.slice(i, i + MAX_SHORTCODES_PER_REQUEST));
  }

  const batched = await Promise.all(
    chunks.map((chunk) =>
      runExternal(
        () =>
          mbusClient.get<BustimeResponse<{ vehicle: Vehicle[] }>>("/getvehicles", {
            params: { requestType: "getvehicles", rt: chunk.join(",") },
          }),
        { op: "getvehicles", detail: { rt: chunk.join(",") } },
      ),
    ),
  );

  const vehicles: Vehicle[] = [];
  for (const r of batched) {
    if (!r.ok) return r;
    const v = r.value.data["bustime-response"].vehicle ?? [];
    vehicles.push(...v);
  }
  return { ok: true, value: vehicles };
}

export async function fetchStopPredictions(stopId: string, routes: string[]) {
  return runExternal(
    () =>
      mbusClient.get(
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
      ),
    { op: "getpredictions", detail: { stpid: stopId } },
  );
}

export async function fetchBusPredictions(busId: string) {
  return runExternal(
    () =>
      mbusClient.get(
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
      ),
    { op: "getpredictions", detail: { vid: busId } },
  );
}

export async function fetchSelectableRoutes() {
  return runExternal(
    () =>
      mbusClient.get(
        "/getroutes",
        {
          params: {
            requestType: "getroutes",
            locale: "en",
          },
        },
      ),
    { op: "getroutes" },
  );
}

export async function fetchPatterns(rt: string) {
  return runExternal(
    () =>
      mbusClient.get(
        "/getpatterns",
        {
          params: {
            requestType: "getpatterns",
            rtpidatafeed: "bustime",
            rt,
          },
        },
      ),
    { op: "getpatterns", detail: { rt } },
  );
} 