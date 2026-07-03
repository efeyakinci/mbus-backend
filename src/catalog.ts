import routeData from "./assets/route-data.json" with { type: "json" };
import type { Catalog } from "./domain.ts";

const names: Record<string, string> = routeData.routeIdToName;
const colors: Record<string, string> = routeData.routeColorsRegular;
const colorblindColors: Record<string, string> = routeData.routeColorsColorblind;

function toHex(flutterColor: string | undefined): string {
  if (!flutterColor || !flutterColor.startsWith("0xFF")) return "#ff0000";
  return `#${flutterColor.slice(4)}`;
}

export const catalog: Catalog = {
  version: routeData.metadata.version,
  routes: Object.keys(names).map((id) => ({
    id,
    name: names[id] ?? id,
    color: toHex(colors[id]),
    colorblindColor: toHex(colorblindColors[id]),
  })),
};

export const catalogRouteIds: string[] = catalog.routes.map((r) => r.id);
