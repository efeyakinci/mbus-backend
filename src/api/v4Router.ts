import { Router, type Request } from "express";
import {
  fetchStopPredictions,
  fetchVehiclePredictions,
  type BustimePredictionsPayload,
} from "../bustime/client.ts";
import { toArrival } from "../bustime/mapping.ts";
import { catalog, catalogRouteIds } from "../catalog.ts";
import content from "../config/content.json" with { type: "json" };
import { networkCache } from "../state/networkCache.ts";
import { vehicleCache } from "../state/vehicleCache.ts";
import { feedbackHandler, feedbackLimiter } from "./feedback.ts";
import { sendVehicleIcon } from "./vehicleIcons.ts";

function toArrivals(payload: BustimePredictionsPayload) {
  return { arrivals: (payload["bustime-response"].prd ?? []).map(toArrival) };
}

export const v4Router = Router();

v4Router.get("/catalog", (req, res) => {
  res.json(catalog);
});

v4Router.get("/network", (req, res) => {
  res.json(networkCache.network);
});

v4Router.get("/vehicles", (req, res) => {
  res.json({ vehicles: vehicleCache.vehicles });
});

v4Router.get(
  "/stops/:stopId/arrivals",
  async (req: Request<{ stopId: string }>, res) => {
    res.json(
      toArrivals(await fetchStopPredictions(req.params.stopId, catalogRouteIds)),
    );
  },
);

v4Router.get(
  "/vehicles/:vehicleId/arrivals",
  async (req: Request<{ vehicleId: string }>, res) => {
    res.json(toArrivals(await fetchVehiclePredictions(req.params.vehicleId)));
  },
);

v4Router.get(
  "/routes/:routeId/icon",
  (req: Request<{ routeId: string }>, res) => {
    sendVehicleIcon(req.params.routeId, req.query.colorblind === "Y", res);
  },
);

v4Router.get("/announcements", (req, res) => {
  res.json({ announcements: content.announcements });
});

v4Router.post("/feedback", feedbackLimiter, feedbackHandler("message"));
