import { WKT_GEOMETRY_TYPES } from "../constants";
import type { WKTGeometryType } from "../constants";
import { testCases } from "./index.test";

const LowerCaseMap: Record<WKTGeometryType, string> = WKT_GEOMETRY_TYPES.reduce((map, type) => {
  const lowerCaseType = type.toLowerCase();
  map[type] = lowerCaseType;
  return map;
}, {} as Record<WKTGeometryType, string>);

testCases(LowerCaseMap, {
  Srid: "srid",
  Z: "z",
  Empty: "empty",
});