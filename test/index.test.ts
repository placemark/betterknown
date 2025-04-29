import { WktUserOptions, geoJSONToWkt, wktToGeoJSON } from "./index";
import { describe, it, expect } from "vitest";
import { Geometry } from "geojson";
import proj4 from "proj4";
import { EMPTY, WKT_GEOMETRY_TYPES, WKTGeometryType } from "../constants";

const WKT_GEOMETRY_TYPES_MAP = WKT_GEOMETRY_TYPES.reduce((map, type) => {
  map[type] = type;
  return map;
}, {} as Record<WKTGeometryType, string>);

const dictionary = {
  Srid: "SRID",
  Z: "Z",
  Empty: "EMPTY",
}
type Dictionary = typeof dictionary;

export function testCases(wktGeometriesMap: Record<WKTGeometryType, string>, dictionary: Dictionary) {
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
    /**
    * The passed WKT is case insensitive,
    * but the output of geoJSONToWkt is upper case.
    * Therefore we cast the returned WKT to upper case.
    */
    expect(wkt).toEqual(wkt1.toUpperCase());
  }

  describe("parsing and stringifying", () => {
    it("overflow resistance", () => {
      const bigString = `${wktGeometriesMap.MultiPolygon} (((${Array.from(
        { length: 1000 },
        (_, i) => `${i}, ${i}`
      ).join(",")})))`;
      expect(wktToGeoJSON(bigString)).toHaveProperty("type", "MultiPolygon");
    });
    it("default as null on empty", () => {
      for (const name of Object.values(wktGeometriesMap)) {
        expect(wktToGeoJSON(`${name} ${dictionary.Empty}`)).toBeNull();
        expect(
          wktToGeoJSON(`${name} ${dictionary.Empty}`, {
            emptyAsNull: false,
          })
        ).toBeTruthy();
      }
    });
    it("point", () => {
      reversible(
        `${wktGeometriesMap.Point} ${dictionary.Empty}`,
        {
          type: "Point",
          coordinates: [],
        },
        {
          emptyAsNull: false,
        }
      );
      reversible(`${wktGeometriesMap.Point} (1 20)`, {
        type: "Point",
        coordinates: [1, 20],
      });
      reversible(`${wktGeometriesMap.Point} (-1.5 20.5)`, {
        type: "Point",
        coordinates: [-1.5, 20.5],
      });
    });
    it("geometrycollection", () => {
      reversible(
        `${wktGeometriesMap.GeometryCollection} ${dictionary.Empty}`,
        {
          type: "GeometryCollection",
          geometries: [],
        },
        {
          emptyAsNull: false,
        }
      );
      reversible(`${wktGeometriesMap.GeometryCollection}(${wktGeometriesMap.Point} (-1.5 20.5))`, {
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
      reversible(`${wktGeometriesMap.Point} ${dictionary.Z} (-1.5 20.5 5)`, {
        type: "Point",
        coordinates: [-1.5, 20.5, 5],
      });
      reversible(
        `${wktGeometriesMap.MultiPoint} ${dictionary.Empty}`,
        {
          type: "MultiPoint",
          coordinates: [],
        },
        {
          emptyAsNull: false,
        }
      );
      reversible(`${wktGeometriesMap.MultiPoint} (1 2,3 4)`, {
        type: "MultiPoint",
        coordinates: [
          [1, 2],
          [3, 4],
        ],
      });
    });
    it("linestring", () => {
      reversible(`${wktGeometriesMap.LineString} (1 2,3 4)`, {
        type: "LineString",
        coordinates: [
          [1, 2],
          [3, 4],
        ],
      });
      reversible(
        `${wktGeometriesMap.LineString} ${dictionary.Empty}`,
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
      reversible(`${wktGeometriesMap.MultiLineString} ((1 2,3 4,1 2))`, {
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
        `${wktGeometriesMap.MultiLineString} ${dictionary.Empty}`,
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
      reversible(`${wktGeometriesMap.MultiPolygon} (((1 2,3 4,1 2)))`, {
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
        `${wktGeometriesMap.MultiPolygon} ${dictionary.Empty}`,
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
      reversible(`${wktGeometriesMap.Polygon} ${dictionary.Z} ((1 2 10,3 4 10,1 2 10))`, {
        type: "Polygon",
        coordinates: [
          [
            [1, 2, 10],
            [3, 4, 10],
            [1, 2, 10],
          ],
        ],
      });
      reversible(`${wktGeometriesMap.Polygon} ((1 2,3 4,1 2))`, {
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
        `${wktGeometriesMap.Polygon} ${dictionary.Empty}`,
        {
          type: "Polygon",
          coordinates: [],
        },
        {
          emptyAsNull: false,
        }
      );
    });

    it("ewkt", () => {
      expect(wktToGeoJSON(`${dictionary.Srid}=4326;${wktGeometriesMap.Point}(-44.3 60.1)`)).toEqual({
        coordinates: [-44.3, 60.1],
        type: "Point",
      });
      expect(
        wktToGeoJSON(`${dictionary.Srid}=3857;${wktGeometriesMap.Point}(-400004.3 60000.1)`, {
          proj: proj4,
        })
      ).toEqual({
        coordinates: [-3.5932997640353026, 0.5389821193537617],
        type: "Point",
      });
    });
  });
};

testCases(WKT_GEOMETRY_TYPES_MAP, dictionary);