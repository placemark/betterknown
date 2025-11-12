import type { Geometry } from "geojson";
import proj4 from "proj4";
import { describe, expect, it, test } from "vitest";
import { WKT_GEOMETRY_TYPES } from "../constants";
import { geoJSONToWkt, type WktUserOptions, wktToGeoJSON } from "./index";

function reversible(
  wkt1: string,
  geometry1: Geometry,
  userOptions: WktUserOptions = {
    emptyAsNull: true,
  },
) {
  const geometry = wktToGeoJSON(wkt1, userOptions);
  expect(geometry).not.toBeNull();
  const wkt = geoJSONToWkt(geometry!);
  expect(geometry).toEqual(geometry1);
  /**
   * The passed WKT is case insensitive,
   * but the output of geoJSONToWkt is upper case.
   * Therefore we cast the returned WKT to upper case.
   */
  expect(wkt).toEqual(wkt1.toUpperCase());
}

describe("parsing and stringifying", () => {
  it("overflow resistance", () => {
    const bigString = `MULTIPOLYGON (((${Array.from(
      { length: 1000 },
      (_, i) => `${i}, ${i}`,
    ).join(",")})))`;
    expect(wktToGeoJSON(bigString)).toHaveProperty("type", "MultiPolygon");
  });
  it("default as null on empty", () => {
    for (const name of WKT_GEOMETRY_TYPES) {
      expect(wktToGeoJSON(`${name} EMPTY`)).toBeNull();
      expect(
        wktToGeoJSON(`${name} EMPTY`, {
          emptyAsNull: false,
        }),
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
      },
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
      },
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
      },
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
      },
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
      },
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
      },
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
      },
    );
  });

  it("ewkt", () => {
    expect(wktToGeoJSON(`SRID=4326;POINT(-44.3 60.1)`)).toEqual({
      coordinates: [-44.3, 60.1],
      type: "Point",
    });
    expect(
      wktToGeoJSON(`SRID=3857;POINT(-400004.3 60000.1)`, {
        proj: proj4,
      }),
    ).toEqual({
      coordinates: [-3.5932997640353026, 0.5389821193537617],
      type: "Point",
    });
  });

  it("geosparql-flavored iri", () => {
    expect(
      wktToGeoJSON(
        `<http://www.opengis.net/def/crs/EPSG/0/4326> Point(33.95 -83.38)`,
      ),
    ).toEqual({
      coordinates: [33.95, -83.38],
      type: "Point",
    });
    expect(
      wktToGeoJSON(
        `<http://www.opengis.net/def/crs/EPSG/0/3857> POINT(-400004.3 60000.1)`,
        {
          proj: proj4,
        },
      ),
    ).toEqual({
      coordinates: [-3.5932997640353026, 0.5389821193537617],
      type: "Point",
    });

    expect(() =>
      wktToGeoJSON(`<http://www.google.com/> POINT(-400004.3 60000.1)`, {
        proj: proj4,
      }),
    ).toThrowError(/GeoSPARQL IRI CRS not recognized/);
  });
});

describe("case insensitivity", () => {
  describe("testing lowercase", () => {
    test.each([
      [
        "point empty",
        {
          type: "Point",
          coordinates: [],
        },
        {
          emptyAsNull: false,
        },
      ],
      [
        "point (-1.5 20.5)",
        {
          type: "Point",
          coordinates: [-1.5, 20.5],
        },
      ],
      [
        "polygon empty",
        {
          type: "Polygon",
          coordinates: [],
        },
        {
          emptyAsNull: false,
        },
      ],
      [
        "polygon z ((1.3 -2.4 10.5,3 4 10,1 2 10))",
        {
          type: "Polygon",
          coordinates: [
            [
              [1.3, -2.4, 10.5],
              [3, 4, 10],
              [1, 2, 10],
            ],
          ],
        },
      ],
      [
        "geometrycollection empty",
        {
          type: "GeometryCollection",
          geometries: [],
        },
        {
          emptyAsNull: false,
        },
      ],
      [
        "geometrycollection(point (-1.5 20.5))",
        {
          type: "GeometryCollection",
          geometries: [
            {
              type: "Point",
              coordinates: [-1.5, 20.5],
            },
          ],
        },
      ],
      [
        "geometrycollection empty",
        {
          type: "GeometryCollection",
          geometries: [],
        },
        {
          emptyAsNull: false,
        },
      ],
      [
        "geometrycollection(point (-1.5 20.5))",
        {
          type: "GeometryCollection",
          geometries: [
            {
              type: "Point",
              coordinates: [-1.5, 20.5],
            },
          ],
        },
      ],
    ] as [string, Geometry, WktUserOptions?][])(
      'parse using lowercase: "%s"',
      (wkt, expected, userOptions) => reversible(wkt, expected, userOptions),
    );

    it("ewkt", () => {
      expect(wktToGeoJSON(`srid=4326;point(-44.3 60.1)`)).toEqual({
        coordinates: [-44.3, 60.1],
        type: "Point",
      });
    });
  });

  describe("testing pascalcase", () => {
    test.each([
      [
        "Point Empty",
        {
          type: "Point",
          coordinates: [],
        },
        {
          emptyAsNull: false,
        },
      ],
      [
        "Point (-1.5 20.5)",
        {
          type: "Point",
          coordinates: [-1.5, 20.5],
        },
      ],
      [
        "Polygon Empty",
        {
          type: "Polygon",
          coordinates: [],
        },
        {
          emptyAsNull: false,
        },
      ],
      [
        "Polygon Z ((1.3 -2.4 10.5,3 4 10,1 2 10))",
        {
          type: "Polygon",
          coordinates: [
            [
              [1.3, -2.4, 10.5],
              [3, 4, 10],
              [1, 2, 10],
            ],
          ],
        },
      ],
      [
        "GeometryCollection empty",
        {
          type: "GeometryCollection",
          geometries: [],
        },
        {
          emptyAsNull: false,
        },
      ],
      [
        "GeometryCollection(Point (-1.5 20.5))",
        {
          type: "GeometryCollection",
          geometries: [
            {
              type: "Point",
              coordinates: [-1.5, 20.5],
            },
          ],
        },
      ],
      [
        "GeometryCollection empty",
        {
          type: "GeometryCollection",
          geometries: [],
        },
        {
          emptyAsNull: false,
        },
      ],
      [
        "GeometryCollection(Point (-1.5 20.5))",
        {
          type: "GeometryCollection",
          geometries: [
            {
              type: "Point",
              coordinates: [-1.5, 20.5],
            },
          ],
        },
      ],
    ] as [string, Geometry, WktUserOptions?][])(
      'parse using lowercase: "%s"',
      (wkt, expected, userOptions) => reversible(wkt, expected, userOptions),
    );

    it("ewkt", () => {
      expect(wktToGeoJSON(`Srid=4326;Point(-44.3 60.1)`)).toEqual({
        coordinates: [-44.3, 60.1],
        type: "Point",
      });
    });
  });
});
