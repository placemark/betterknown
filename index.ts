import type {
  Geometry,
  Position,
  Point,
  LineString,
  MultiPoint,
  GeometryCollection,
} from "geojson";

type WktOptions = ZM & {
  srid: number | null;
};

type GeometryParser = (arg0: WktParser, options: WktOptions) => Geometry | null;

interface ZM {
  hasZ: boolean;
  hasM: boolean;
}

const WKT_GEOMETRY_TYPES = [
  "POINT",
  "LINESTRING",
  "POLYGON",
  "MULTIPOINT",
  "MULTILINESTRING",
  "MULTIPOLYGON",
  "GEOMETRYCOLLECTION",
] as const;

const ZZM = ["ZM", "Z", "M"];

const EMPTY = "EMPTY";

export class WktParser {
  value: string;
  position: number;

  constructor(value: string) {
    this.value = value;
    this.position = 0;
  }

  match<T extends string>(tokens: readonly T[]): T | null {
    this.skipWhitespaces();

    for (var i = 0; i < tokens.length; i++) {
      if (this.value.startsWith(tokens[i], this.position)) {
        this.position += tokens[i].length;
        return tokens[i];
      }
    }

    return null;
  }

  matchRegex(tokens: RegExp[]) {
    this.skipWhitespaces();

    for (var i = 0; i < tokens.length; i++) {
      var match = this.value.substring(this.position).match(tokens[i]);

      if (match) {
        this.position += match[0].length;
        return match;
      }
    }

    return null;
  }

  isMatch(tokens: string[]) {
    this.skipWhitespaces();

    for (var i = 0; i < tokens.length; i++) {
      if (this.value.startsWith(tokens[i], this.position)) {
        this.position += tokens[i].length;
        return true;
      }
    }

    return false;
  }

  matchType() {
    const geometryType = this.match(WKT_GEOMETRY_TYPES);
    if (!geometryType) throw new Error("Expected geometry type");
    return geometryType;
  }

  matchDimension(): ZM {
    var dimension = this.match(ZZM);

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
    if (!this.isMatch(["("])) throw new Error("Expected group start");
  }

  expectGroupEnd() {
    if (!this.isMatch([")"])) throw new Error("Expected group end");
  }

  matchCoordinate(options: ZM): Position {
    let match: RegExpMatchArray | null;

    if (options.hasZ && options.hasM) {
      match = this.matchRegex([/^(\S*)\s+(\S*)\s+(\S*)\s+([^\s,)]*)/]);
    } else if (options.hasZ || options.hasM) {
      match = this.matchRegex([/^(\S*)\s+(\S*)\s+([^\s,)]*)/]);
    } else {
      match = this.matchRegex([/^(\S*)\s+([^\s,)]*)/]);
    }

    if (!match) throw new Error("Expected coordinates");

    if (options.hasZ && options.hasM) {
      return [
        parseFloat(match[1]),
        parseFloat(match[2]),
        parseFloat(match[3]),
        parseFloat(match[4]),
      ];
    } else if (options.hasZ) {
      return [parseFloat(match[1]), parseFloat(match[2]), parseFloat(match[3])];
    } else if (options.hasM) {
      return [
        parseFloat(match[1]),
        parseFloat(match[2]),
        // undefined,
        // parseFloat(match[3]),
      ];
    } else {
      return [parseFloat(match[1]), parseFloat(match[2])];
    }
  }

  matchCoordinates(options: ZM): Position[] {
    var coordinates = [];

    do {
      var startsWithBracket = this.isMatch(["("]);

      coordinates.push(this.matchCoordinate(options));

      if (startsWithBracket) this.expectGroupEnd();
    } while (this.isMatch([","]));

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
  if (value.isMatch([EMPTY])) return null;

  value.expectGroupStart();

  const coordinates = value.matchCoordinate(options);

  value.expectGroupEnd();

  return {
    type: "Point",
    coordinates,
  };
};

const parseWktLineString: GeometryParser = (value, options) => {
  if (value.isMatch([EMPTY])) return null;

  value.expectGroupStart();
  const coordinates = value.matchCoordinates(options);
  value.expectGroupEnd();

  return {
    type: "LineString",
    coordinates,
  };
};

const parseWktPolygon: GeometryParser = (value, options) => {
  if (value.isMatch([EMPTY])) return null;

  const coordinates = [];

  value.expectGroupStart();

  value.expectGroupStart();
  coordinates.push(value.matchCoordinates(options));
  value.expectGroupEnd();

  while (value.isMatch([","])) {
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
  if (value.isMatch([EMPTY])) return null;

  value.expectGroupStart();
  const coordinates = value.matchCoordinates(options);
  value.expectGroupEnd();

  return {
    type: "MultiPoint",
    coordinates,
  };
};

const parseWktMultiLineString: GeometryParser = (value, options) => {
  if (value.isMatch([EMPTY])) return null;

  value.expectGroupStart();

  const coordinates = [];

  do {
    value.expectGroupStart();
    coordinates.push(value.matchCoordinates(options));
    value.expectGroupEnd();
  } while (value.isMatch([","]));

  value.expectGroupEnd();

  return {
    type: "MultiLineString",
    coordinates,
  };
};

const parseWktMultiPolygon: GeometryParser = (value, options) => {
  if (value.isMatch([EMPTY])) return null;

  value.expectGroupStart();

  const coordinates = [];

  do {
    value.expectGroupStart();

    const exteriorRing: Position[] = [];
    const interiorRings: Position[][] = [];

    value.expectGroupStart();
    exteriorRing.push.apply(exteriorRing, value.matchCoordinates(options));
    value.expectGroupEnd();

    while (value.isMatch([","])) {
      value.expectGroupStart();
      interiorRings.push(value.matchCoordinates(options));
      value.expectGroupEnd();
    }

    coordinates.push([exteriorRing, ...interiorRings]);

    value.expectGroupEnd();
  } while (value.isMatch([","]));

  value.expectGroupEnd();

  return {
    type: "MultiPolygon",
    coordinates,
  };
};

const parseWktGeometryCollection: GeometryParser = (value, options) => {
  if (value.isMatch([EMPTY])) return null;
  value.expectGroupStart();

  const geometries: Geometry[] = [];

  do {
    const geometry = parseWkt(value);
    if (geometry) {
      geometries.push(geometry);
    }
  } while (value.isMatch([","]));

  value.expectGroupEnd();

  return {
    type: "GeometryCollection",
    geometries,
  };
};

function stringifyCoordinate(point: Position): string {
  const coordinates = point.join(" ");
  return coordinates;
}

function stringifyZM(position: Position): string {
  switch (position.length) {
    case 3:
      return " Z ";
    default:
      return " ";
  }
}

function stringifyPoint(point: Point): string {
  if (point.coordinates === null) {
    return "POINT EMPTY";
  }
  return `POINT${stringifyZM(point.coordinates)}(${stringifyCoordinate(
    point.coordinates
  )})`;
}

function stringifyMultiPoint(geometry: MultiPoint): string {
  if (geometry.coordinates === null) {
    return "MULTIPOINT EMPTY";
  }

  const innerWkt = `(${geometry.coordinates
    .map((coordinate) => stringifyCoordinate(coordinate))
    .join(",")})`;

  return `MULTIPOINT${stringifyZM(geometry.coordinates[0])}${innerWkt}`;
}

function stringifyLineString(geometry: LineString): string {
  if (geometry.coordinates === null) {
    return "LINESTRING EMPTY";
  }

  const innerWkt = `(${geometry.coordinates
    .map((coordinate) => stringifyCoordinate(coordinate))
    .join(",")})`;

  return `LINESTRING${stringifyZM(geometry.coordinates[0])}${innerWkt}`;
}

function stringifyGeometryCollection(geometry: GeometryCollection): string {
  if (geometry.geometries === null) {
    return "GEOMETRYCOLLECTION EMPTY";
  }

  const innerWkt = `(${geometry.geometries
    .map((geometry) => stringifyGeoJSON(geometry))
    .join(",")})`;

  return `GEOMETRYCOLLECTION${innerWkt}`;
}

export function stringifyGeoJSON(geometry: Geometry): string {
  switch (geometry.type) {
    case "Point":
      return stringifyPoint(geometry);
    case "LineString":
      return stringifyLineString(geometry);
    case "MultiPoint":
      return stringifyMultiPoint(geometry);
    case "GeometryCollection":
      return stringifyGeometryCollection(geometry);
    default:
      return "";
  }
}

/**
 * Parse WKT input into GeoJSON output.
 */
export function parseWkt(value: string | WktParser) {
  let srid: number | null = null;

  const wktParser = value instanceof WktParser ? value : new WktParser(value);

  const match = wktParser.matchRegex([/^SRID=(\d+);/]);
  if (match) srid = parseInt(match[1], 10);

  const geometryType = wktParser.matchType();
  const dimension = wktParser.matchDimension();

  const options: WktOptions = {
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