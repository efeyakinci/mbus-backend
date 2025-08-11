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

export async function fetchVehicles(routes: string[]): Promise<Vehicle[]> {
  const res = await mbusClient.get<BustimeResponse<{ vehicle: Vehicle[] }>>(
    "/getvehicles",
    {
      params: {
        requestType: "getvehicles",
        rt: routes.join(","),
      },
    },
  );

  return res.data["bustime-response"].vehicle ?? [];
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