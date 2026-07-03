import path from "node:path";
import type { Response } from "express";
import routeData from "../assets/route-data.json" with { type: "json" };
import content from "../config/content.json" with { type: "json" };

const assetPath = path.join(import.meta.dirname, "..", "assets");
const routeImages: Record<string, string> = routeData.routeImages;

export function sendVehicleIcon(
  routeId: string,
  colorblind: boolean,
  res: Response,
) {
  const image = routeImages[routeId];
  if (!image) {
    res.status(400).sendFile(path.join(assetPath, "bus_CN.png"));
    return;
  }

  const variant = colorblind ? "colorblind" : content.vehicleIconVariant;
  res.sendFile(path.join(assetPath, variant, image));
}
