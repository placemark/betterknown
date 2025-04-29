import { WKT_GEOMETRY_TYPES, EMPTY } from "../constants";
import type { WKTGeometryType } from "../constants";
import { testCases } from "./index.test";

const UpperCaseMap: Record<WKTGeometryType, string> = WKT_GEOMETRY_TYPES.reduce((map, type) => {
  const lowerCaseType = type.toUpperCase();
  map[type] = lowerCaseType;
  return map;
}, {} as Record<WKTGeometryType, string>);

testCases(UpperCaseMap, {
  Srid: "SRID",
  Z: "Z",
  Empty: "EMPTY",
});