---
"betterknown": minor
---

Support for stringifying according to OGC SFA 1.2.0 standard. 
Specifically, this changes the MULTIPOINT syntax: in 1.2.0,
a MULTIPOINT looks like `MULTIPOINT ((1 2),(3 4))`. In previous
versions, it looks like `MULTIPOINT (1 2,3 4)`.

You can choose a specific version by supplying an options argument
to `geoJsonToWkt`:

```ts
geoJSONToWkt({
  type: "MultiPoint",
  coordinates: [
    [1, 2],
    [3, 4],
  ],
}, { version: '1.2.0' })
```

There is no `version` option for parsing WKT at this point, because
it cleanly parses 1.1.1 and 1.2.0 already.
