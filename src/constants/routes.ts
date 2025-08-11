export const ROUTE_SHORTCODES = [
  "BB",
  "CN",
  "CS",
  "CSX",
  "DD",
  "MX",
  "NE",
  "NW",
  "NX",
  "OS",
  "NES",
  "WS",
  "WX",
] as const;

export type RouteShortcode = typeof ROUTE_SHORTCODES[number]; 