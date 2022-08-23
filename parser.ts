interface ZM {
  hasZ: boolean;
  hasM: boolean;
}

export class WktParser {
  value: string;
  position: number;
  constructor(value: string) {
    this.value = value;
    this.position = 0;
  }
}

WktParser.prototype.match = function (tokens: string[]) {
  this.skipWhitespaces();

  for (var i = 0; i < tokens.length; i++) {
    if (this.value.substring(this.position).indexOf(tokens[i]) === 0) {
      this.position += tokens[i].length;
      return tokens[i];
    }
  }

  return null;
};

WktParser.prototype.matchRegex = function (tokens: RegExp[]) {
  this.skipWhitespaces();

  for (var i = 0; i < tokens.length; i++) {
    var match = this.value.substring(this.position).match(tokens[i]);

    if (match) {
      this.position += match[0].length;
      return match;
    }
  }

  return null;
};

WktParser.prototype.isMatch = function (tokens: string[]) {
  this.skipWhitespaces();

  for (var i = 0; i < tokens.length; i++) {
    if (this.value.substring(this.position).indexOf(tokens[i]) === 0) {
      this.position += tokens[i].length;
      return true;
    }
  }

  return false;
};

WktParser.prototype.matchType = function () {
  var geometryType = this.match([
    "POINT",
    "LINESTRING",
    "POLYGON",
    "MULTIPOINT",
    "MULTILINESTRING",
    "MULTIPOLYGON",
    "GEOMETRYCOLLECTION",
  ]);

  if (!geometryType) throw new Error("Expected geometry type");

  return geometryType;
};

WktParser.prototype.matchDimension = function (): ZM {
  var dimension = this.match(["ZM", "Z", "M"]);

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
};

WktParser.prototype.expectGroupStart = function () {
  if (!this.isMatch(["("])) throw new Error("Expected group start");
};

WktParser.prototype.expectGroupEnd = function () {
  if (!this.isMatch([")"])) throw new Error("Expected group end");
};

WktParser.prototype.matchCoordinate = function (options: ZM) {
  let match;

  if (options.hasZ && options.hasM)
    match = this.matchRegex([/^(\S*)\s+(\S*)\s+(\S*)\s+([^\s,)]*)/]);
  else if (options.hasZ || options.hasM)
    match = this.matchRegex([/^(\S*)\s+(\S*)\s+([^\s,)]*)/]);
  else match = this.matchRegex([/^(\S*)\s+([^\s,)]*)/]);

  if (!match) throw new Error("Expected coordinates");

  if (options.hasZ && options.hasM)
    return [
      parseFloat(match[1]),
      parseFloat(match[2]),
      parseFloat(match[3]),
      parseFloat(match[4]),
    ];
  else if (options.hasZ)
    return [parseFloat(match[1]), parseFloat(match[2]), parseFloat(match[3])];
  else if (options.hasM)
    return [
      parseFloat(match[1]),
      parseFloat(match[2]),
      undefined,
      parseFloat(match[3]),
    ];
  else return [parseFloat(match[1]), parseFloat(match[2])];
};

WktParser.prototype.matchCoordinates = function (options: ZM) {
  var coordinates = [];

  do {
    var startsWithBracket = this.isMatch(["("]);

    coordinates.push(this.matchCoordinate(options));

    if (startsWithBracket) this.expectGroupEnd();
  } while (this.isMatch([","]));

  return coordinates;
};

WktParser.prototype.skipWhitespaces = function () {
  while (this.position < this.value.length && this.value[this.position] === " ")
    this.position++;
};
