import { Request, Response } from "express";
import path from "node:path";
import * as metadata from "@/assets/route-data.json";
import { busState } from "@/state/busState";
import { fetchStopPredictions, fetchBusPredictions } from "@/api/mbus";
import { ROUTE_SHORTCODES } from "@/constants/routes";

const dirname = import.meta.dirname;
const assetPath = path.join(dirname, "..", "assets");
const colorBlindPath = path.join(assetPath, "colorblind");
const grad24Path = path.join(assetPath, "grad-24");
const routeImages: { [k: string]: string } = (metadata as any).routeImages;

export function getBusPositions(req: Request, res: Response) {
  res.json(busState.currentPositions);
}

export function getVehiclePositions(req: Request, res: Response) {
  res.json(busState.currentPositions);
}

export function getSelectableRoutes(req: Request, res: Response) {
  res.json(busState.currentRouteSelections);
}

export function getAllRoutes(req: Request, res: Response) {
  res.json({ routes: busState.allCachedRoutes });
}

export function getVehicleImage(req: Request, res: Response) {
  const { route } = req.params;
  const isColorblind = req.query.colorblind === "Y";

  if (!route || !(route in routeImages)) {
    res.status(400).sendFile(path.join(assetPath, "bus_CN.png"));
    return;
  }

  const imagePath = isColorblind
    ? path.join(colorBlindPath, routeImages[route])
    : path.join(grad24Path, routeImages[route]);
  res.sendFile(imagePath);
}

export function getRouteInfoVersion(req: Request, res: Response) {
  res.json({ version: (metadata as any).metadata.version });
}

export function getRouteInformation(req: Request, res: Response) {
  const isColorblind = req.query.colorblind === "Y";
  const infoToSend: Record<string, unknown> = {
    routeIdToName: (metadata as any).routeIdToName,
    routeImages: routeImages,
    metadata: (metadata as any).metadata,
    routeColors: isColorblind ? (metadata as any).routeColorsColorblind : (metadata as any).routeColorsRegular,
  };
  res.json(infoToSend);
}

export function getStartupMessages(req: Request, res: Response) {
  const message = {
    id: "gradamatation",
    title: "Congrats Grads 🥳",
    message:
      "Congrats to everyone who is gradamatating! Enjoy some grad hats on the buses, and don't forget to celebrate!",
    buildVersion: "99",
  };
  res.json(message);
}

export async function getStopPredictions(req: Request, res: Response) {
  const { stopId } = req.params;
  const data = await fetchStopPredictions(stopId, [...ROUTE_SHORTCODES]);
  res.json(data);
}

export async function getBusPredictions(req: Request, res: Response) {
  const { busId } = req.params;
  try {
    const data = await fetchBusPredictions(busId);
    res.json(data);
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
}

export function getUpdateNotes(req: Request, res: Response) {
  res.json({
    message: "- ·Fixed Northeast Shuttle Icons\n- ·Working bus icons for Northeast Shuttle\n- ·General improvements",
    version: "7",
  });
} 