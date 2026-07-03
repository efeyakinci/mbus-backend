import { API_KEY } from "../config/env.ts";

const BASE_URL = "https://mbus.ltp.umich.edu/bustime/api/v3";
const TIMEOUT_MS = 5_000;

export class HttpError extends Error {
  readonly status: number;

  constructor(status: number, url: string) {
    super(`HTTP ${status} from ${url}`);
    this.status = status;
  }
}

export type Result<T> =
  | { ok: true; value: T }
  | { ok: false; error: { message: string; status?: number } };

async function getBustime<T>(
  endpoint: string,
  params: Record<string, string | number>,
): Promise<T> {
  const query = new URLSearchParams({ key: API_KEY, format: "json" });
  for (const [name, value] of Object.entries(params)) {
    query.set(name, String(value));
  }
  const response = await fetch(`${BASE_URL}/${endpoint}?${query}`, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new HttpError(response.status, `${BASE_URL}/${endpoint}`);
  }
  return response.json() as Promise<T>;
}

async function run<T>(
  op: () => Promise<T>,
  context: { op: string; detail?: Record<string, unknown> },
): Promise<Result<T>> {
  try {
    return { ok: true, value: await op() };
  } catch (err) {
    const status = err instanceof HttpError ? err.status : undefined;
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[BusTime] ${context.op} failed`, {
      message,
      status,
      ...context.detail,
    });
    return { ok: false, error: { message, status } };
  }
}

/**
 * Raw BusTime wire types. Nothing outside src/bustime/ should touch these,
 * except the frozen legacy v3 API, which serves some payloads verbatim.
 * Numeric fields arrive as numbers or strings depending on the endpoint.
 */
export interface BustimeVehicle {
  vid: string;
  rt: string;
  lat: number | string;
  lon: number | string;
  hdg: number | string;
  psgld?: string;
  [k: string]: unknown;
}

export interface BustimePrediction {
  vid: string;
  rt: string;
  stpid: string;
  stpnm: string;
  des: string;
  prdctdn: string;
  [k: string]: unknown;
}

export interface BustimePatternPoint {
  typ: string;
  stpid?: string;
  stpnm?: string;
  lat: number | string;
  lon: number | string;
  [k: string]: unknown;
}

export interface BustimePattern {
  pt: BustimePatternPoint[];
  dtrpt?: BustimePatternPoint[];
  [k: string]: unknown;
}

export interface BustimeResponse<T> {
  "bustime-response": T;
}

export type BustimeRoutesPayload = BustimeResponse<{
  routes?: { rt: string; rtnm: string }[];
}>;

export type BustimePredictionsPayload = BustimeResponse<{
  prd?: BustimePrediction[];
}>;

/**
 * The upstream API silently returns an empty array if too many shortcodes are
 * supplied in a single request. Empirically, requests with > 9 shortcodes can
 * fail this way, so we batch with a maximum of 5 per call and merge.
 */
export async function fetchVehicles(
  routeIds: string[],
): Promise<Result<BustimeVehicle[]>> {
  if (routeIds.length === 0) return { ok: true, value: [] };

  const MAX_SHORTCODES_PER_REQUEST = 5;
  const chunks: string[][] = [];
  for (let i = 0; i < routeIds.length; i += MAX_SHORTCODES_PER_REQUEST) {
    chunks.push(routeIds.slice(i, i + MAX_SHORTCODES_PER_REQUEST));
  }

  const batched = await Promise.all(
    chunks.map((chunk) =>
      run(
        () =>
          getBustime<BustimeResponse<{ vehicle?: BustimeVehicle[] }>>(
            "getvehicles",
            { requestType: "getvehicles", rt: chunk.join(",") },
          ),
        { op: "getvehicles", detail: { rt: chunk.join(",") } },
      ),
    ),
  );

  const vehicles: BustimeVehicle[] = [];
  for (const r of batched) {
    if (!r.ok) return r;
    vehicles.push(...(r.value["bustime-response"].vehicle ?? []));
  }
  return { ok: true, value: vehicles };
}

export async function fetchStopPredictions(
  stopId: string,
  routeIds: string[],
): Promise<Result<BustimePredictionsPayload>> {
  return run(
    () =>
      getBustime("getpredictions", {
        requestType: "getpredictions",
        locale: "en",
        stpid: stopId,
        rt: routeIds.join(","),
        rtpidatafeed: "bustime",
        top: 4,
      }),
    { op: "getpredictions", detail: { stpid: stopId } },
  );
}

export async function fetchVehiclePredictions(
  vehicleId: string,
): Promise<Result<BustimePredictionsPayload>> {
  return run(
    () =>
      getBustime("getpredictions", {
        requestType: "getpredictions",
        locale: "en",
        vid: vehicleId,
        top: 4,
        tmres: "s",
        rtpidatafeed: "bustime",
      }),
    { op: "getpredictions", detail: { vid: vehicleId } },
  );
}

export async function fetchRoutes(): Promise<Result<BustimeRoutesPayload>> {
  return run(
    () =>
      getBustime("getroutes", {
        requestType: "getroutes",
        locale: "en",
      }),
    { op: "getroutes" },
  );
}

export async function fetchPatterns(
  routeId: string,
): Promise<Result<BustimeResponse<{ ptr?: BustimePattern[] }>>> {
  return run(
    () =>
      getBustime("getpatterns", {
        requestType: "getpatterns",
        rtpidatafeed: "bustime",
        rt: routeId,
      }),
    { op: "getpatterns", detail: { rt: routeId } },
  );
}
