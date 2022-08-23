import { WktUserOptions, geoJSONToWkt, wktToGeoJSON } from "./index";
import { test, describe, it, expect } from "vitest";
import { Geometry } from "geojson";
import { WKT_GEOMETRY_TYPES } from "../constants";

function reversible(
  wkt1: string,
  geometry1: Geometry,
  userOptions: WktUserOptions = {
    emptyAsNull: true,
  }
) {
  const geometry = wktToGeoJSON(wkt1, userOptions);
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
  it("default as null on empty", () => {
    for (const name of WKT_GEOMETRY_TYPES) {
      expect(wktToGeoJSON(`${name} EMPTY`)).toBeNull();
      expect(
        wktToGeoJSON(`${name} EMPTY`, {
          emptyAsNull: false,
        })
      ).toBeTruthy();
    }
  });
  it("point", () => {
    reversible(
      "POINT EMPTY",
      {
        type: "Point",
        coordinates: [],
      },
      {
        emptyAsNull: false,
      }
    );
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
    reversible(
      "GEOMETRYCOLLECTION EMPTY",
      {
        type: "GeometryCollection",
        geometries: [],
      },
      {
        emptyAsNull: false,
      }
    );
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
    reversible(
      "MULTIPOINT EMPTY",
      {
        type: "MultiPoint",
        coordinates: [],
      },
      {
        emptyAsNull: false,
      }
    );
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
    reversible(
      "LINESTRING EMPTY",
      {
        type: "LineString",
        coordinates: [],
      },
      {
        emptyAsNull: false,
      }
    );
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
    reversible(
      "MULTILINESTRING EMPTY",
      {
        type: "MultiLineString",
        coordinates: [],
      },
      {
        emptyAsNull: false,
      }
    );
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
    reversible(
      "MULTIPOLYGON EMPTY",
      {
        type: "MultiPolygon",
        coordinates: [],
      },
      {
        emptyAsNull: false,
      }
    );
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
    reversible(
      "POLYGON EMPTY",
      {
        type: "Polygon",
        coordinates: [],
      },
      {
        emptyAsNull: false,
      }
    );
  });
});
