import type {
  Geometry,
  Position,
  Point,
  LineString,
  MultiPoint,
  GeometryCollection,
  Polygon,
  MultiPolygon,
  MultiLineString,
} from "geojson";
import { EMPTY, WKT_GEOMETRY_TYPES, ZZM } from "./constants";

interface ZM {
  hasZ: boolean;
  hasM: boolean;
}

/**
 * User-facing options for the WKT parser.
 */
export interface WktUserOptions {
  /**
   * By default, this is true.
   *
   * WKT has a concept of an 'EMPTY' geometry: for example,
   * `POINT EMPTY`.
   *
   * GeoJSON has two similar representations:
   *
   * 1. `null` as the geometry. This allows a GeoJSON Feature
   *    to have no geometry attached to it. However, it also
   *    does not indicate what kind of geometry would be attached
   *    to it. It's not a null Point, it's just null.
   * 2. An empty `coordinates` array. This is rarer than null
   *    geometries, and makes it possible to reflect the exact
   *    idea from WKT. However, this is much rarer in practice -
   *    depending on what you're doing with the GeoJSON you generate,
   *    empty coordinates arrays might trip up another parser.
   *
   * By default, we encode `EMPTY` as `null` geometries. This
   * is more likely to work with GeoJSON-understanding systems.
   *
   * The disadvantage of `EMPTY` as `null` is that it isn't symmetrical:
   * a WKT string like `POINT EMPTY` will translate to `null`,
   * but if you convert `null` back to WKT, it won't be represented
   * as anything, because there's no indication of its geometry type.
   */
  emptyAsNull?: true;

  /**
   * An optional method for reprojecting EWKT strings.
   *
   * The GeoJSON standard does not support alternative coordinate
   * systems: all GeoJSON is longitude, latitude. EWKT _does_ support
   * alternative coordinate systems, so in order to parse it into
   * GeoJSON we also need to reproject those coordinates.
   *
   * A common way to do this would be to use proj4js. That module
   * exposes a method you can use as `proj`:
   *
   * ```ts
   * import proj4 from "proj4";
   *
   * wktToGeoJSON(`SRID=3857;POINT(-400004.3 60000.1)`, {
   *   proj: proj4,
   * })
   * ```
   *
   * This will reproject coordinates as they're being converted to GeoJSON.
   *
   * This method is optional. Without it, all WKT features will work, and
   * EWKT features that are already in the GeoJSON required coordinate system
   * (in this case, EPSG:4326) will also work.
   *
   * However, if you convert an EWKT string with an alternative projection and
   * you _haven't_ specified a proj function, then the parsing will fail.
   */
  proj?: (
    fromProjection: string,
    toProjection: string,
    coordinate: Position
  ) => Position;
}

type WktOptions = WktUserOptions &
  ZM & {
    srid: number | null;
  };

type GeometryParser = (arg0: WktParser, options: WktOptions) => Geometry | null;

class WktParser {
  value: string;
  position: number;

  constructor(value: string) {
    this.value = value;
    this.position = 0;
  }

  match<T extends string>(tokens: readonly T[]): T | null {
    this.skipWhitespaces();

    for (const token of tokens) {
      if (this.value.startsWith(token, this.position)) {
        this.position += token.length;
        return token;
      }
    }

    return null;
  }

  matchRegex(tokens: RegExp[]) {
    this.skipWhitespaces();

    for (const token of tokens) {
      const match = this.value.substring(this.position).match(token);

      if (match) {
        this.position += match[0].length;
        return match;
      }
    }

    return null;
  }

  /**
   * In wkx, this method supports an array, but was only used
   * with one element, so this version skips the array allocations
   * & the loop.
   */
  isMatch(token: string) {
    this.skipWhitespaces();

    if (this.value.startsWith(token, this.position)) {
      this.position += token.length;
      return true;
    }

    return false;
  }

  matchType() {
    const geometryType = this.match(WKT_GEOMETRY_TYPES);
    if (!geometryType) throw new Error("Expected geometry type");
    return geometryType;
  }

  matchDimension(): ZM {
    const dimension = this.match(ZZM);

    switch (dimension) {
      case "ZM":
        return { hasZ: true, hasM: true };
      case "Z":
        return { hasZ: true, hasM: false };
      case "M":
        return { hasZ: false, hasM: true };
      default:
        return { hasZ: false, hasM: false };
    }
  }

  expectGroupStart() {
    if (!this.isMatch("(")) throw new Error("Expected group start");
  }

  expectGroupEnd() {
    if (!this.isMatch(")")) throw new Error("Expected group end");
  }

  matchCoordinate(options: WktOptions): Position {
    let match: RegExpMatchArray | null;

    if (options.hasZ && options.hasM) {
      match = this.matchRegex([/^(\S*)\s+(\S*)\s+(\S*)\s+([^\s,)]*)/]);
    } else if (options.hasZ || options.hasM) {
      match = this.matchRegex([/^(\S*)\s+(\S*)\s+([^\s,)]*)/]);
    } else {
      match = this.matchRegex([/^(\S*)\s+([^\s,)]*)/]);
    }

    if (!match) throw new Error("Expected coordinates");

    const position: Position =
      options.hasZ && options.hasM
        ? [
            parseFloat(match[1]),
            parseFloat(match[2]),
            parseFloat(match[3]),
            parseFloat(match[4]),
          ]
        : options.hasZ
        ? [parseFloat(match[1]), parseFloat(match[2]), parseFloat(match[3])]
        : options.hasM
        ? [
            parseFloat(match[1]),
            parseFloat(match[2]),
            // undefined,
            // parseFloat(match[3]),
          ]
        : [parseFloat(match[1]), parseFloat(match[2])];

    if (options.srid && options.srid !== 4326) {
      if (options.proj) {
        return options.proj(`EPSG:${options.srid}`, "EPSG:4326", position);
      } else {
        throw new Error(
          `EWKT data in an unknown SRID (${options.srid}) was provided, but a proj function was not`
        );
      }
    }

    return position;
  }

  matchCoordinates(options: WktOptions): Position[] {
    const coordinates = [];

    do {
      const startsWithBracket = this.isMatch("(");

      coordinates.push(this.matchCoordinate(options));

      if (startsWithBracket) this.expectGroupEnd();
    } while (this.isMatch(","));

    return coordinates;
  }

  skipWhitespaces() {
    while (
      this.position < this.value.length &&
      this.value[this.position] === " "
    ) {
      this.position++;
    }
  }
}

const parseWktPoint: GeometryParser = (value, options) => {
  if (value.isMatch(EMPTY)) {
    return options.emptyAsNull ? null : { type: "Point", coordinates: [] };
  }

  value.expectGroupStart();

  const coordinates = value.matchCoordinate(options);

  value.expectGroupEnd();

  return {
    type: "Point",
    coordinates,
  };
};

const parseWktLineString: GeometryParser = (value, options) => {
  if (value.isMatch(EMPTY)) {
    return options.emptyAsNull ? null : { type: "LineString", coordinates: [] };
  }

  value.expectGroupStart();
  const coordinates = value.matchCoordinates(options);
  value.expectGroupEnd();

  return {
    type: "LineString",
    coordinates,
  };
};

const parseWktPolygon: GeometryParser = (value, options) => {
  if (value.isMatch(EMPTY)) {
    return options.emptyAsNull ? null : { type: "Polygon", coordinates: [] };
  }

  const coordinates = [];

  value.expectGroupStart();

  value.expectGroupStart();
  coordinates.push(value.matchCoordinates(options));
  value.expectGroupEnd();

  while (value.isMatch(",")) {
    value.expectGroupStart();
    coordinates.push(value.matchCoordinates(options));
    value.expectGroupEnd();
  }

  value.expectGroupEnd();

  return {
    type: "Polygon",
    coordinates,
  };
};

const parseWktMultiPoint: GeometryParser = (value, options) => {
  if (value.isMatch(EMPTY)) {
    return options.emptyAsNull ? null : { type: "MultiPoint", coordinates: [] };
  }

  value.expectGroupStart();
  const coordinates = value.matchCoordinates(options);
  value.expectGroupEnd();

  return {
    type: "MultiPoint",
    coordinates,
  };
};

const parseWktMultiLineString: GeometryParser = (value, options) => {
  if (value.isMatch(EMPTY)) {
    return options.emptyAsNull
      ? null
      : { type: "MultiLineString", coordinates: [] };
  }

  value.expectGroupStart();

  const coordinates = [];

  do {
    value.expectGroupStart();
    coordinates.push(value.matchCoordinates(options));
    value.expectGroupEnd();
  } while (value.isMatch(","));

  value.expectGroupEnd();

  return {
    type: "MultiLineString",
    coordinates,
  };
};

const parseWktMultiPolygon: GeometryParser = (value, options) => {
  if (value.isMatch(EMPTY)) {
    return options.emptyAsNull
      ? null
      : { type: "MultiPolygon", coordinates: [] };
  }

  value.expectGroupStart();

  const coordinates = [];

  do {
    value.expectGroupStart();

    const exteriorRing: Position[] = [];
    const interiorRings: Position[][] = [];

    value.expectGroupStart();
    exteriorRing.push.apply(exteriorRing, value.matchCoordinates(options));
    value.expectGroupEnd();

    while (value.isMatch(",")) {
      value.expectGroupStart();
      interiorRings.push(value.matchCoordinates(options));
      value.expectGroupEnd();
    }

    coordinates.push([exteriorRing, ...interiorRings]);

    value.expectGroupEnd();
  } while (value.isMatch(","));

  value.expectGroupEnd();

  return {
    type: "MultiPolygon",
    coordinates,
  };
};

const parseWktGeometryCollection: GeometryParser = (value, options) => {
  if (value.isMatch(EMPTY)) {
    return options.emptyAsNull
      ? null
      : { type: "GeometryCollection", geometries: [] };
  }
  value.expectGroupStart();

  const geometries: Geometry[] = [];

  do {
    const geometry = wktToGeoJSONinner(value, options);
    if (geometry) {
      geometries.push(geometry);
    }
  } while (value.isMatch(","));

  value.expectGroupEnd();

  return {
    type: "GeometryCollection",
    geometries,
  };
};

function stringifyCoordinate(point: Position): string {
  return point.join(" ");
}

function stringifyZM(position: Position | undefined): string {
  if (position === undefined) {
    return " ";
  }
  switch (position.length) {
    case 3:
      return " Z ";
    default:
      return " ";
  }
}

function stringifyPoint(point: Point): string {
  if (point.coordinates.length === 0) {
    return "POINT EMPTY";
  }

  return `POINT${stringifyZM(point.coordinates)}(${stringifyCoordinate(
    point.coordinates
  )})`;
}

function stringifyMultiPoint(geometry: MultiPoint): string {
  if (geometry.coordinates.length === 0) {
    return "MULTIPOINT EMPTY";
  }

  return `MULTIPOINT${stringifyZM(
    geometry.coordinates[0]
  )}(${geometry.coordinates
    .map((coordinate) => stringifyCoordinate(coordinate))
    .join(",")})`;
}

function stringifyLineString(geometry: LineString): string {
  if (geometry.coordinates.length === 0) {
    return "LINESTRING EMPTY";
  }

  const innerWkt = `(${geometry.coordinates
    .map((coordinate) => stringifyCoordinate(coordinate))
    .join(",")})`;

  return `LINESTRING${stringifyZM(geometry.coordinates[0])}${innerWkt}`;
}

function stringifyGeometryCollection(geometry: GeometryCollection): string {
  if (geometry.geometries.length === 0) {
    return "GEOMETRYCOLLECTION EMPTY";
  }

  const innerWkt = `(${geometry.geometries
    .map((geometry) => geoJSONToWkt(geometry))
    .join(",")})`;

  return `GEOMETRYCOLLECTION${innerWkt}`;
}

function stringifyMultiLineString(geometry: MultiLineString): string {
  if (geometry.coordinates.length === 0) {
    return "MULTILINESTRING EMPTY";
  }

  const innerWkt = `(${geometry.coordinates.map((ring) => {
    return `(${ring.map((coordinate) => stringifyCoordinate(coordinate))})`;
  })})`;

  return `MULTILINESTRING${stringifyZM(geometry.coordinates[0][0])}${innerWkt}`;
}

function stringifyPolygon(geometry: Polygon): string {
  if (geometry.coordinates.length === 0) {
    return "POLYGON EMPTY";
  }

  const innerWkt = `(${geometry.coordinates.map((ring) => {
    return `(${ring.map((coordinate) => stringifyCoordinate(coordinate))})`;
  })})`;

  return `POLYGON${stringifyZM(geometry.coordinates[0]?.[0])}${innerWkt}`;
}

function stringifyMultiPolygon(geometry: MultiPolygon): string {
  if (geometry.coordinates.length === 0) {
    return "MULTIPOLYGON EMPTY";
  }

  const innerWkt = `(${geometry.coordinates.map((polygon) => {
    return `(${polygon.map((ring) => {
      return `(${ring.map((coordinate) => stringifyCoordinate(coordinate))})`;
    })})`;
  })})`;

  return `MULTIPOLYGON${stringifyZM(
    geometry.coordinates[0]?.[0]?.[0]
  )}${innerWkt}`;
}

function wktToGeoJSONinner(wktParser: WktParser, userOptions: WktUserOptions) {
  let srid: number | null = null;

  const match = wktParser.matchRegex([/^SRID=(\d+);/]);
  if (match) srid = parseInt(match[1], 10);

  const geometryType = wktParser.matchType();
  const dimension = wktParser.matchDimension();

  const options: WktOptions = {
    ...userOptions,
    srid: srid,
    hasZ: dimension.hasZ,
    hasM: dimension.hasM,
  };

  switch (geometryType) {
    case "POINT":
      return parseWktPoint(wktParser, options);
    case "LINESTRING":
      return parseWktLineString(wktParser, options);
    case "POLYGON":
      return parseWktPolygon(wktParser, options);
    case "MULTIPOINT":
      return parseWktMultiPoint(wktParser, options);
    case "MULTILINESTRING":
      return parseWktMultiLineString(wktParser, options);
    case "MULTIPOLYGON":
      return parseWktMultiPolygon(wktParser, options);
    case "GEOMETRYCOLLECTION":
      return parseWktGeometryCollection(wktParser, options);
  }
}

/**
 * Stringify GeoJSON as WKT. There are no options to this
 * conversion. Some finer notes on the conversion:
 *
 * - GeoJSON does not support alternative projections, so the
 *   output of this method is always WKT, never EWKT.
 * - GeoJSON technically supports geometries with mixed
 *   coordinates: some coordinates can have a Z element
 *   for altitude, some will not. WKT does not: the Z (or M)
 *   element is part of the geometry's name.
 * - Geometries with empty coordinates arrays will be
 *   stringified as "EMPTY" WKT geometries. This is technically
 *   valid, but rare, for GeoJSON.
 */
export function geoJSONToWkt(geometry: Geometry): string {
  switch (geometry.type) {
    case "Point":
      return stringifyPoint(geometry);
    case "LineString":
      return stringifyLineString(geometry);
    case "MultiPoint":
      return stringifyMultiPoint(geometry);
    case "GeometryCollection":
      return stringifyGeometryCollection(geometry);
    case "Polygon":
      return stringifyPolygon(geometry);
    case "MultiPolygon":
      return stringifyMultiPolygon(geometry);
    case "MultiLineString":
      return stringifyMultiLineString(geometry);
  }
}

/**
 * Parse WKT input into GeoJSON output.
 */
export function wktToGeoJSON(
  /**
   * The WKT or EWKT content as a string.
   */
  wkt: string,
  /**
   * Optional options: consult the type documentation for this.
   * You’ll need to configure options if you want a different
   * representation of empty geometries or to plug in a method
   * of reprojecting EWKT.
   */
  options: WktUserOptions = {
    emptyAsNull: true,
  }
) {
  return wktToGeoJSONinner(new WktParser(wkt), options);
}
