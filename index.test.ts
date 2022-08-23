import { geoJSONToWkt, wktToGeoJSON } from "./index";
import { test, describe, it, expect } from "vitest";
import { Geometry } from "geojson";

function reversible(wkt1: string, geometry1: Geometry) {
  const geometry = wktToGeoJSON(wkt1);
  expect(geometry).not.toBeNull();
  const wkt = geoJSONToWkt(geometry!);
  expect(geometry).toEqual(geometry1);
  expect(wkt).toEqual(wkt1);
}

describe("parsing and stringifying", () => {
  it("overflow resistance", () => {
    const bigString = `MULTIPOLYGON (((${Array.from(
      { length: 1000 },
      (_, i) => `${i}, ${i}`
    ).join(",")})))`;
    expect(wktToGeoJSON(bigString)).toHaveProperty("type", "MultiPolygon");
  });
  it("point", () => {
    expect(wktToGeoJSON("POINT EMPTY")).toEqual(null);
    reversible("POINT (1 20)", {
      type: "Point",
      coordinates: [1, 20],
    });
    reversible("POINT (-1.5 20.5)", {
      type: "Point",
      coordinates: [-1.5, 20.5],
    });
  });
  it("geometrycollection", () => {
    reversible("GEOMETRYCOLLECTION(POINT (-1.5 20.5))", {
      type: "GeometryCollection",
      geometries: [
        {
          type: "Point",
          coordinates: [-1.5, 20.5],
        },
      ],
    });
  });
  it("multipoint", () => {
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
  });
  it("linestring", () => {
    reversible("LINESTRING (1 2,3 4)", {
      type: "LineString",
      coordinates: [
        [1, 2],
        [3, 4],
      ],
    });
  });
  it("multilinestring", () => {
    reversible("MULTILINESTRING ((1 2,3 4,1 2))", {
      type: "MultiLineString",
      coordinates: [
        [
          [1, 2],
          [3, 4],
          [1, 2],
        ],
      ],
    });
  });
  it("multipolygon", () => {
    reversible("MULTIPOLYGON (((1 2,3 4,1 2)))", {
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
  });
  it("polygon", () => {
    reversible("POLYGON Z ((1 2 10,3 4 10,1 2 10))", {
      type: "Polygon",
      coordinates: [
        [
          [1, 2, 10],
          [3, 4, 10],
          [1, 2, 10],
        ],
      ],
    });
    reversible("POLYGON ((1 2,3 4,1 2))", {
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
