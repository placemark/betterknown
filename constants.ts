export const WKT_GEOMETRY_TYPES = [
  "Point",
  "LineString",
  "Polygon",
  "MultiPoint",
  "MultiLineString",
  "MultiPolygon",
  "GeometryCollection",
] as const;

// Create a type from WKT_GEOMETRY_TYPES
export type WKTGeometryType = (typeof WKT_GEOMETRY_TYPES)[number];

export const ZZM = ["ZM", "Z", "M"];

export const EMPTY = "EMPTY";
