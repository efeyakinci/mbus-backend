import { z } from "zod";
import { API_KEY } from "../config/env.ts";

const BASE_URL = "https://mbus.ltp.umich.edu/bustime/api/v3";
const TIMEOUT_MS = 5_000;

export class BustimeUnavailableError extends Error {
  readonly status = 503;

  constructor(
    endpoint: string,
    params: Record<string, string | number>,
    cause: unknown,
  ) {
    super(`BusTime ${endpoint} failed (${JSON.stringify(params)})`, { cause });
  }
}

/**
 * Raw BusTime wire schemas. Nothing outside src/bustime/ should consume the
 * payloads directly, except the frozen legacy v3 API, which serves some of
 * them verbatim — so schemas are loose and non-coercing: parsing must not
 * drop or transform fields. Numeric fields arrive as numbers or strings
 * depending on the endpoint.
 */
const numberLike = z.union([z.number(), z.string()]);

const vehicleSchema = z.looseObject({
  vid: z.string(),
  rt: z.string(),
  lat: numberLike,
  lon: numberLike,
  hdg: numberLike,
  psgld: z.string().optional(),
});

const predictionSchema = z.looseObject({
  vid: z.string(),
  rt: z.string(),
  stpid: z.string(),
  stpnm: z.string(),
  des: z.string(),
  prdctdn: z.string(),
});

const patternPointSchema = z.looseObject({
  typ: z.string(),
  stpid: z.string().optional(),
  stpnm: z.string().optional(),
  lat: numberLike,
  lon: numberLike,
});

const patternSchema = z.looseObject({
  pt: z.array(patternPointSchema),
  dtrpt: z.array(patternPointSchema).optional(),
});

// The upstream reports errors (bad key, no data in service window) inside
// "bustime-response" with HTTP 200, so payload fields are optional and each
// endpoint decides whether their absence is benign.
const bustimeResponse = <T extends z.ZodType>(body: T) =>
  z.looseObject({ "bustime-response": body });

const vehiclesPayloadSchema = bustimeResponse(
  z.looseObject({ vehicle: z.array(vehicleSchema).optional() }),
);

const predictionsPayloadSchema = bustimeResponse(
  z.looseObject({ prd: z.array(predictionSchema).optional() }),
);

const routesPayloadSchema = bustimeResponse(
  z.looseObject({
    routes: z
      .array(z.looseObject({ rt: z.string(), rtnm: z.string() }))
      .optional(),
  }),
);

const patternsPayloadSchema = bustimeResponse(
  z.looseObject({ ptr: z.array(patternSchema).optional() }),
);

export type BustimeVehicle = z.infer<typeof vehicleSchema>;
export type BustimePrediction = z.infer<typeof predictionSchema>;
export type BustimePattern = z.infer<typeof patternSchema>;
export type BustimePredictionsPayload = z.infer<
  typeof predictionsPayloadSchema
>;
export type BustimeRoutesPayload = z.infer<typeof routesPayloadSchema>;
export type BustimePatternsPayload = z.infer<typeof patternsPayloadSchema>;

async function getBustime<T>(
  endpoint: string,
  params: Record<string, string | number>,
  schema: z.ZodType<T>,
): Promise<T> {
  const query = new URLSearchParams({ key: API_KEY, format: "json" });
  for (const [name, value] of Object.entries(params)) {
    query.set(name, String(value));
  }
  try {
    const response = await fetch(`${BASE_URL}/${endpoint}?${query}`, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return schema.parse(await response.json());
  } catch (cause) {
    throw new BustimeUnavailableError(endpoint, params, cause);
  }
}

/**
 * The upstream API silently returns an empty array if too many shortcodes are
 * supplied in a single request. Empirically, requests with > 9 shortcodes can
 * fail this way, so we batch with a maximum of 5 per call and merge.
 */
export async function fetchVehicles(
  routeIds: string[],
): Promise<BustimeVehicle[]> {
  const MAX_SHORTCODES_PER_REQUEST = 5;
  const chunks: string[][] = [];
  for (let i = 0; i < routeIds.length; i += MAX_SHORTCODES_PER_REQUEST) {
    chunks.push(routeIds.slice(i, i + MAX_SHORTCODES_PER_REQUEST));
  }

  const payloads = await Promise.all(
    chunks.map((chunk) =>
      getBustime(
        "getvehicles",
        { requestType: "getvehicles", rt: chunk.join(",") },
        vehiclesPayloadSchema,
      ),
    ),
  );

  return payloads.flatMap((p) => p["bustime-response"].vehicle ?? []);
}

export async function fetchStopPredictions(
  stopId: string,
  routeIds: string[],
): Promise<BustimePredictionsPayload> {
  return getBustime(
    "getpredictions",
    {
      requestType: "getpredictions",
      locale: "en",
      stpid: stopId,
      rt: routeIds.join(","),
      rtpidatafeed: "bustime",
      top: 4,
    },
    predictionsPayloadSchema,
  );
}

export async function fetchVehiclePredictions(
  vehicleId: string,
): Promise<BustimePredictionsPayload> {
  return getBustime(
    "getpredictions",
    {
      requestType: "getpredictions",
      locale: "en",
      vid: vehicleId,
      top: 4,
      tmres: "s",
      rtpidatafeed: "bustime",
    },
    predictionsPayloadSchema,
  );
}

export async function fetchRoutes(): Promise<BustimeRoutesPayload> {
  return getBustime(
    "getroutes",
    { requestType: "getroutes", locale: "en" },
    routesPayloadSchema,
  );
}

export async function fetchPatterns(
  routeId: string,
): Promise<BustimePatternsPayload> {
  return getBustime(
    "getpatterns",
    { requestType: "getpatterns", rtpidatafeed: "bustime", rt: routeId },
    patternsPayloadSchema,
  );
}
