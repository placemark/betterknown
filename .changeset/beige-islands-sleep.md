---
"betterknown": patch
---

Fix GeoSPARQL-flavored WKT support

In 1.1.0, the GeoSPARQL support would parse the IRI-style SRS
identifiers, but did not flip coordinates according to the spec.
This update _does_ swap coordinates for 4326, and relies on the user
to handle non 4326-projections. This will require some custom code
because proj4 does not support the GeoSPARQL style, or a non-proj4
projection library that does support IRIs (which I have not found).
