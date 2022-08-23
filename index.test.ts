import { parseWkt, stringifyGeoJSON, WktParser } from "./index";
import { test, describe, it, expect } from "vitest";
import { Geometry } from "geojson";

test("WktParser", () => {
  const p = new WktParser("POINT EMPTY");
  expect(p.matchType()).toEqual("POINT");
  expect(p.position).toEqual(5);
});

function reversible(wkt1: string, geometry1: Geometry) {
  const geometry = parseWkt(wkt1);
  expect(geometry).not.toBeNull();
  const wkt = stringifyGeoJSON(geometry!);
  expect(geometry).toEqual(geometry1);
  expect(wkt).toEqual(wkt1);
}

describe("stringifyGeoJSON", () => {
  it("point", () => {
    reversible("POINT (1 20)", {
      type: "Point",
      coordinates: [1, 20],
    });
  });
});

describe("parseWkt", () => {
  it("overflow resistance", () => {
    const bigString = `MULTIPOLYGON (((${Array.from(
      { length: 1000 },
      (_, i) => `${i}, ${i}`
    ).join(",")})))`;
    expect(parseWkt(bigString)).toHaveProperty("type", "MultiPolygon");
  });
  it("point", () => {
    expect(parseWkt("POINT EMPTY")).toEqual(null);

    reversible("POINT (-1.5 20.5)", {
      type: "Point",
      coordinates: [-1.5, 20.5],
    });
    reversible("GEOMETRYCOLLECTION(POINT (-1.5 20.5))", {
      type: "GeometryCollection",
      geometries: [
        {
          type: "Point",
          coordinates: [-1.5, 20.5],
        },
      ],
    });
    reversible("POINT Z (-1.5 20.5 5)", {
      type: "Point",
      coordinates: [-1.5, 20.5, 5],
    });
    reversible("MULTIPOINT (1 2,3 4)", {
      type: "MultiPoint",
      coordinates: [
        [1, 2],
        [3, 4],
      ],
    });
    reversible("LINESTRING (1 2,3 4)", {
      type: "LineString",
      coordinates: [
        [1, 2],
        [3, 4],
      ],
    });
    expect(parseWkt("MULTILINESTRING ((1 2, 3 4, 1 2))")).toEqual({
      type: "MultiLineString",
      coordinates: [
        [
          [1, 2],
          [3, 4],
          [1, 2],
        ],
      ],
    });
    expect(parseWkt("MULTIPOLYGON (((1 2, 3 4, 1 2)))")).toEqual({
      type: "MultiPolygon",
      coordinates: [
        [
          [
            [1, 2],
            [3, 4],
            [1, 2],
          ],
        ],
      ],
    });
    expect(parseWkt("POLYGON ((1 2, 3 4, 1 2))")).toEqual({
      type: "Polygon",
      coordinates: [
        [
          [1, 2],
          [3, 4],
          [1, 2],
        ],
      ],
    });
  });
});
