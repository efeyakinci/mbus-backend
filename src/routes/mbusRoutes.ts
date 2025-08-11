import { Router } from "express";
import {
  getBusPositions,
  getVehiclePositions,
  getSelectableRoutes,
  getAllRoutes,
  getVehicleImage,
  getRouteInfoVersion,
  getRouteInformation,
  getStartupMessages,
  getStopPredictions,
  getBusPredictions,
  getUpdateNotes,
} from "@/controllers/mbusController";

export const mbusRouter = Router();

mbusRouter.get("/getBusPositions", getBusPositions);
mbusRouter.get("/getVehiclePositions", getVehiclePositions);
mbusRouter.get("/getSelectableRoutes", getSelectableRoutes);
mbusRouter.get("/getAllRoutes", getAllRoutes);
mbusRouter.get("/getVehicleImage/:route", getVehicleImage);
mbusRouter.get("/getRouteInfoVersion", getRouteInfoVersion);
mbusRouter.get("/getRouteInformation", getRouteInformation);
mbusRouter.get("/get-startup-messages", getStartupMessages);
mbusRouter.get("/getStopPredictions/:stopId", getStopPredictions);
mbusRouter.get("/getBusPredictions/:busId", getBusPredictions);
mbusRouter.get("/getUpdateNotes", getUpdateNotes);

// Initialize background tasks once when this module is imported
import { busState } from "@/state/busState";
busState.start(); 