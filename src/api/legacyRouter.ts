// Frozen wire format for app builds <= 12, which parse raw BusTime payloads.
// Serves from the same caches as v4. Delete once those builds are gone.
import { Router, type Request } from "express";
import {
  fetchStopPredictions,
  fetchVehiclePredictions,
} from "../bustime/client.ts";
import { catalogRouteIds } from "../catalog.ts";
import routeData from "../assets/route-data.json" with { type: "json" };
import content from "../config/content.json" with { type: "json" };
import { networkCache } from "../state/networkCache.ts";
import { vehicleCache } from "../state/vehicleCache.ts";
import { feedbackHandler, feedbackLimiter } from "./feedback.ts";
import { sendVehicleIcon } from "./vehicleIcons.ts";

export const legacyRouter = Router();

legacyRouter.get("/getVehiclePositions", (req, res) => {
  res.json(vehicleCache.legacyPositions);
});

legacyRouter.get("/getSelectableRoutes", (req, res) => {
  res.json(networkCache.legacyRouteSelections);
});

legacyRouter.get("/getAllRoutes", (req, res) => {
  res.json({ routes: networkCache.legacyPatterns });
});

legacyRouter.get(
  "/getVehicleImage/:route",
  (req: Request<{ route: string }>, res) => {
    sendVehicleIcon(req.params.route, req.query.colorblind === "Y", res);
  },
);

legacyRouter.get("/getRouteInfoVersion", (req, res) => {
  res.json({ version: routeData.metadata.version });
});

legacyRouter.get("/getRouteInformation", (req, res) => {
  const isColorblind = req.query.colorblind === "Y";
  res.json({
    routeIdToName: routeData.routeIdToName,
    routeImages: routeData.routeImages,
    metadata: routeData.metadata,
    routeColors: isColorblind
      ? routeData.routeColorsColorblind
      : routeData.routeColorsRegular,
  });
});

legacyRouter.get("/get-startup-messages", (req, res) => {
  res.json(content.legacy.startupMessage);
});

legacyRouter.get("/getUpdateNotes", (req, res) => {
  res.json(content.legacy.updateNotes);
});

legacyRouter.get(
  "/getStopPredictions/:stopId",
  async (req: Request<{ stopId: string }>, res) => {
    res.json(await fetchStopPredictions(req.params.stopId, catalogRouteIds));
  },
);

legacyRouter.get(
  "/getBusPredictions/:busId",
  async (req: Request<{ busId: string }>, res) => {
    res.json(await fetchVehiclePredictions(req.params.busId));
  },
);

legacyRouter.post(
  "/give-feedback",
  feedbackLimiter,
  feedbackHandler("feedbackBody"),
);
