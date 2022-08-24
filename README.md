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
