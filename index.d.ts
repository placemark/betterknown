import type { Geometry, Position } from "geojson";
interface ZM {
    hasZ: boolean;
    hasM: boolean;
}
declare class WktParser {
    value: string;
    position: number;
    constructor(value: string);
    match<T extends string>(tokens: readonly T[]): T | null;
    matchRegex(tokens: RegExp[]): RegExpMatchArray;
    isMatch(tokens: string[]): boolean;
    matchType(): "POINT" | "LINESTRING" | "POLYGON" | "MULTIPOINT" | "MULTILINESTRING" | "MULTIPOLYGON" | "GEOMETRYCOLLECTION";
    matchDimension(): ZM;
    expectGroupStart(): void;
    expectGroupEnd(): void;
    matchCoordinate(options: ZM): Position;
    matchCoordinates(options: ZM): Position[];
    skipWhitespaces(): void;
}
export declare function geoJSONToWkt(geometry: Geometry): string;
/**
 * Parse WKT input into GeoJSON output.
 */
export declare function wktToGeoJSON(value: string | WktParser): Geometry;
export {};
