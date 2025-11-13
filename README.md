# betterknown

_betterknown development is supported by 🌎 [placemark.io](https://www.placemark.io/)_

I wrote [wellknown](https://github.com/mapbox/wellknown), a WKT parser and stringifier,
eons ago. It's still sort of popular but nobody maintained it after I left Mapbox.

There's [wkx](https://github.com/cschwarz/wkx), which is stricter and honestly
has a better parser, plus supports WKB, but it's also abandoned and has some drawbacks -
no TypeScript, somewhat idiosyncratic code, and the bundle size is larger than it
needs to be because it brings in browserify shims.

This project aims to be the combination of the two projects. Lightweight like
wellknown, strict and correct like wkx, plus with the 2022 energy of supporting
TypeScript from day one.

- 100% TypeScript
- **No dependencies** - tiny bundle
- Parse WKT to GeoJSON, stringify GeoJSON to WKT
- Optional reprojection of EWKT to GeoJSON's required WGS84 coordinate system
- Support for GeoSPARQL-flavored WKT

### [📕 Documentation](https://placemark.github.io/betterknown/)

### Example

```ts
import { wktToGeoJSON, geoJSONToWkt } from "betterknown";
import proj4 from "proj4";

// Converting & reprojecting an EWKT string
wktToGeoJSON(`SRID=3857;POINT(-400004.3 60000.1)`, {
  proj: proj4,
});

// Converting GeoJSON to WKT
geoJSONToWkt({
  type: 'Point',
  coordinates: [1, 2]
});
```

### GeoSPARQL-flavored WKT

This specification of WKT specifies [Literal Axis Order](https://docs.ogc.org/is/22-047r1/22-047r1.html#req_geometry_extension_wkt-axis-order),
which diverges from WKT and EWKT.

For example the input

```
<http://www.opengis.net/def/crs/EPSG/0/4326> Point(33.95 -83.38)
```

Produces this GeoJSON, with flipped coordinate order.

```json
{
  "coordinates": [-83.38, 33.95],
  "type": "Point",
}
```

The behavior of Betterknown in this situation is:

- If the IRI is exactly `http://www.opengis.net/def/crs/EPSG/0/4326`, then we flip coordinates.
- If it is provided and not exactly that string, then we call the `proj` method, and
  you're in charge of reprojection and flipping coordinates: the `proj` method will receive
  the IRI string. Note that `proj4` does _not_ support the IRI-style projection URLs,
  so you'll have to include custom code here. An example of using `proj4` with these URLs
  is listed below.
