# betterknown

## 1.1.0

### Minor Changes

- 1ece273: Support GeoSPARQL-style IRI identifiers for projections

  This adds support for WKT strings that look like this:

  ```
  <http://www.opengis.net/def/crs/EPSG/0/4326> Point(33.95 -83.38)
  ```

  This is an addition to WKT from the [GeoSPARQL specification](https://docs.ogc.org/is/22-047r1/22-047r1.html#_877a702f-f4d3-464c-81e9-d8a1f37a13f5), which uses an IRI (internationalized URI)
  as a specifier for projections. This isn't a very common form outside
  of GeoSPARQL, so the impact to other users is likely small.

  Parsing strings with this requires you to supply the `proj`
  parameter to the parser unless the IRI is `http://www.opengis.net/def/crs/EPSG/0/4326`,
  in which case it's a no-op because GeoJSON is also in EPSG:4326.

  Internally, these IRIs are transformed into normal EPSG:4326-style
  strings. Only IRIs that start with `http://www.opengis.net/def/crs/EPSG/0/`
  are currently supported.
